import { prisma } from "@/lib/prisma"
import { log } from "@/lib/logger"
import { generateCode } from "@/lib/utils"
import { ValidationError } from "@/lib/exceptions"
import { createMovement } from "@/features/stock-movements/services/stock-movement.service"
import { hasOutstandingDebt, allocatePaymentFifo } from "@/features/debts/services/debt.service"
import { createDeposit, useDeposit } from "@/features/deposits/services/deposit.service"
import { addEntry } from "@/features/ledger/services/ledger.service"
import type { CheckoutInput } from "../schemas/pos.schema"

export async function processCheckout(payload: CheckoutInput, userId: string) {
  const { customerId, items, paidAmount, paymentMethod, discountAmount, notes, overpayAction, depositUsed = 0, depositId } = payload

  // 1. Hitung amounts
  const subtotal = items.reduce(
    (sum, item) => sum + (item.sellPrice - item.discountAmount) * item.quantity,
    0
  )
  const totalAmount = subtotal - discountAmount
  // Effective amount yang harus dibayar setelah deposit
  const effectivePaid = paidAmount + depositUsed
  const debtAmount = Math.max(0, totalAmount - effectivePaid)
  const overpayAmount = Math.max(0, effectivePaid - totalAmount)

  // 2. Validasi walk-in tidak boleh hutang
  if (!customerId && debtAmount > 0) {
    log.warn("[POS]", "Walk-in customer attempted debt payment", { totalAmount, paidAmount, debtAmount })
    throw new ValidationError("Customer walk-in harus membayar lunas")
  }

  // 3. Tentukan paymentStatus
  const paymentStatus = effectivePaid >= totalAmount ? "PAID" : effectivePaid > 0 ? "PARTIAL" : "UNPAID"

  // 4. Validasi stok
  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { stock: true, name: true, isActive: true },
    })
    if (!product || !product.isActive) throw new ValidationError(`Produk tidak ditemukan atau tidak aktif`)
    if (product.stock < item.quantity) {
      throw new ValidationError(`Stok ${product.name} tidak cukup. Tersedia: ${product.stock}, diminta: ${item.quantity}`)
    }
  }

  const code = generateCode("TRX")

  const transaction = await prisma.$transaction(async (tx) => {
    // 5. Buat Transaction
    const trx = await tx.transaction.create({
      data: {
        code,
        customerId: customerId ?? null,
        userId,
        subtotal,
        discountAmount,
        totalAmount,
        paidAmount,
        changeAmount: 0,
        debtAmount,
        depositUsed,
        paymentMethod,
        paymentStatus,
        notes: notes ?? null,
      },
    })

    // 6. Buat TransactionItems + decrement stok
    for (const item of items) {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: item.productId },
        select: { name: true, buyPrice: true },
      })
      await tx.transactionItem.create({
        data: {
          transactionId: trx.id,
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          sellPrice: item.sellPrice,
          buyPrice: product.buyPrice,
          discountAmount: item.discountAmount,
          subtotal: (item.sellPrice - item.discountAmount) * item.quantity,
        },
      })
      await createMovement(tx, {
        productId: item.productId,
        type: "SALE_OUT",
        quantity: -item.quantity,
        referenceCode: code,
        transactionId: trx.id,
      })
    }

    // 7. Buat LedgerEntry untuk customer (jika ada)
    if (customerId) {
      // INVOICE DEBIT
      await addEntry({
        partyType: "CUSTOMER",
        partyId: customerId,
        type: "INVOICE",
        direction: "DEBIT",
        amount: totalAmount,
        description: `Penjualan ${code}`,
        referenceType: "TRANSACTION",
        referenceId: trx.id,
        createdBy: userId,
      }, tx)

      // PAYMENT_IN CREDIT (uang tunai)
      if (paidAmount > 0) {
        await addEntry({
          partyType: "CUSTOMER",
          partyId: customerId,
          type: "PAYMENT_IN",
          direction: "CREDIT",
          amount: paidAmount,
          description: `Bayar ${code}`,
          paymentMethod,
          referenceType: "TRANSACTION",
          referenceId: trx.id,
          createdBy: userId,
        }, tx)
      }

      // DEPOSIT_OUT DEBIT (deposit dipakai)
      if (depositUsed > 0) {
        await addEntry({
          partyType: "CUSTOMER",
          partyId: customerId,
          type: "DEPOSIT_OUT",
          direction: "DEBIT",
          amount: depositUsed,
          description: `Deposit dipakai untuk ${code}`,
          referenceType: "TRANSACTION",
          referenceId: trx.id,
          createdBy: userId,
        }, tx)
      }
    }

    // 8. Buat Debt jika ada
    if (debtAmount > 0 && customerId) {
      await tx.debt.create({
        data: {
          customerId,
          transactionId: trx.id,
          originalAmount: debtAmount,
          remainingAmount: debtAmount,
          status: effectivePaid === 0 ? "UNPAID" : "PARTIAL",
        },
      })
    }

    // 9. Handle overpay
    let finalChangeAmount = 0
    let depositCreated = 0

    if (overpayAmount > 0 && customerId) {
      const hasOldDebt = await hasOutstandingDebt(customerId)
      if (hasOldDebt) {
        // Alokasi ke hutang lama (FIFO)
        await allocatePaymentFifo(customerId, overpayAmount, trx.id, undefined, tx)
        finalChangeAmount = 0
      } else if (overpayAction === "deposit") {
        // Simpan sebagai deposit
        depositCreated = overpayAmount
        await addEntry({
          partyType: "CUSTOMER",
          partyId: customerId,
          type: "DEPOSIT_IN",
          direction: "CREDIT",
          amount: overpayAmount,
          description: `Deposit dari kelebihan bayar ${code}`,
          referenceType: "TRANSACTION",
          referenceId: trx.id,
          createdBy: userId,
        }, tx)
        // Buat Deposit record
        await tx.deposit.create({
          data: {
            partyType: "CUSTOMER",
            partyId: customerId,
            amount: overpayAmount,
            balance: overpayAmount,
            source: "OVERPAY_TRANSACTION",
            sourceId: trx.id,
          },
        })
      } else {
        // Kembalikan tunai (default)
        finalChangeAmount = overpayAmount
      }
    } else if (overpayAmount > 0) {
      finalChangeAmount = overpayAmount
    }

    // 10. Update changeAmount + depositCreated
    const finalTrx = await tx.transaction.update({
      where: { id: trx.id },
      data: { changeAmount: finalChangeAmount, depositCreated },
    })

    log.info("[POS]", "Checkout completed", {
      code,
      customerId: customerId ?? "walk-in",
      totalAmount,
      paidAmount,
      depositUsed,
      debtAmount,
      changeAmount: finalChangeAmount,
      depositCreated,
      paymentStatus,
    })

    return finalTrx
  })

  // Jika ada deposit yang dipakai, update deposit record
  if (depositUsed > 0 && depositId && customerId) {
    await useDeposit(depositId, depositUsed, "TRANSACTION", transaction.id, userId)
  }

  return prisma.transaction.findUniqueOrThrow({
    where: { id: transaction.id },
    include: {
      items: { include: { product: { select: { name: true, code: true, unit: true } } } },
      customer: { select: { id: true, name: true } },
      debt: true,
    },
  })
}
