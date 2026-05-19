import { prisma } from "@/lib/prisma"
import { log } from "@/lib/logger"
import { generateCode } from "@/lib/utils"
import { ValidationError } from "@/lib/exceptions"
import { createMovement } from "@/features/stock-movements/services/stock-movement.service"
import { hasOutstandingDebt, allocatePaymentFifo } from "@/features/debts/services/debt.service"
import type { CheckoutInput } from "../schemas/pos.schema"

export async function processCheckout(payload: CheckoutInput, userId: string) {
  const { customerId, items, paidAmount, paymentMethod, discountAmount, notes } = payload

  // 1. Hitung amounts
  const subtotal = items.reduce(
    (sum, item) => sum + (item.sellPrice - item.discountAmount) * item.quantity,
    0
  )
  const totalAmount = subtotal - discountAmount
  const debtAmount = Math.max(0, totalAmount - paidAmount)
  const overpayAmount = Math.max(0, paidAmount - totalAmount)

  // 2. Validasi walk-in tidak boleh hutang
  if (!customerId && debtAmount > 0) {
    log.warn("[POS]", "Walk-in customer attempted debt payment", {
      totalAmount,
      paidAmount,
      debtAmount,
    })
    throw new ValidationError("Customer walk-in harus membayar lunas")
  }

  // 3. Tentukan paymentStatus
  const paymentStatus =
    paidAmount >= totalAmount ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID"

  // 4. Validasi stok semua item sebelum transaksi
  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { stock: true, name: true, isActive: true },
    })
    if (!product || !product.isActive) {
      throw new ValidationError(`Produk tidak ditemukan atau tidak aktif`)
    }
    if (product.stock < item.quantity) {
      throw new ValidationError(
        `Stok ${product.name} tidak cukup. Tersedia: ${product.stock}, diminta: ${item.quantity}`
      )
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
        changeAmount: 0, // akan diupdate setelah FIFO
        debtAmount,
        paymentMethod,
        paymentStatus,
        notes: notes ?? null,
      },
    })

    // 6. Buat TransactionItems (snapshot harga)
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

      // 7. Decrement stok
      await createMovement(tx, {
        productId: item.productId,
        type: "SALE_OUT",
        quantity: -item.quantity,
        referenceCode: code,
        transactionId: trx.id,
      })
    }

    // 8. Buat Debt jika ada
    if (debtAmount > 0 && customerId) {
      await tx.debt.create({
        data: {
          customerId,
          transactionId: trx.id,
          originalAmount: debtAmount,
          remainingAmount: debtAmount,
          status: paidAmount === 0 ? "UNPAID" : "PARTIAL",
        },
      })
    }

    // 9. Handle overpay
    let finalChangeAmount = 0
    if (overpayAmount > 0 && customerId) {
      const hasOldDebt = await hasOutstandingDebt(customerId)
      if (hasOldDebt) {
        await allocatePaymentFifo(customerId, overpayAmount, trx.id, undefined, tx)
        finalChangeAmount = 0
      } else {
        finalChangeAmount = overpayAmount
      }
    } else if (overpayAmount > 0) {
      finalChangeAmount = overpayAmount
    }

    // 10. Update changeAmount
    const finalTrx = await tx.transaction.update({
      where: { id: trx.id },
      data: { changeAmount: finalChangeAmount },
    })

    log.info("[POS]", "Checkout completed", {
      code,
      customerId: customerId ?? "walk-in",
      totalAmount,
      paidAmount,
      debtAmount,
      changeAmount: finalChangeAmount,
      paymentStatus,
    })

    return finalTrx
  })

  // Return full transaction
  return prisma.transaction.findUniqueOrThrow({
    where: { id: transaction.id },
    include: {
      items: { include: { product: { select: { name: true, code: true, unit: true } } } },
      customer: { select: { id: true, name: true } },
      debt: true,
    },
  })
}
