import { prisma } from "@/lib/prisma"
import { log } from "@/lib/logger"
import { generateSequentialCode } from "@/lib/code-generator"
import { ValidationError, NotFoundError, ConflictError } from "@/lib/exceptions"
import { createMovement } from "@/features/stock-movements/services/stock-movement.service"
import { hasOutstandingDebt, allocatePaymentFifo } from "@/features/debts/services/debt.service"
import { createDeposit, useDepositFifo } from "@/features/deposits/services/deposit.service"
import { addEntry } from "@/features/ledger/services/ledger.service"
import type { CreateDraftInput, ConfirmTransactionInput } from "../schemas/pos.schema"

// ─── Create Draft ─────────────────────────────────────────────────────────────
// Simpan order sebagai DRAFT: item + reservedStock, belum ada efek keuangan

export async function createDraft(payload: CreateDraftInput, userId: string) {
  const { customerId, items, discountAmount, notes } = payload

  // Validasi stok tersedia (availableStock = stock - reservedStock)
  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { stock: true, reservedStock: true, name: true, isActive: true },
    })
    if (!product || !product.isActive) {
      throw new ValidationError(`Produk tidak ditemukan atau tidak aktif`)
    }
    const available = product.stock - product.reservedStock
    if (available < item.quantity) {
      throw new ValidationError(
        `Stok ${product.name} tidak cukup. Tersedia: ${available}, diminta: ${item.quantity}`
      )
    }
  }

  const code = await generateSequentialCode("TRX")
  const subtotal = items.reduce(
    (sum, item) => sum + (item.sellPrice - item.discountAmount) * item.quantity,
    0
  )
  const totalAmount = subtotal - discountAmount

  log.debug("[POS]", "Creating draft", {
    code,
    customerId: customerId ?? "walk-in",
    itemCount: items.length,
    subtotal,
    discountAmount,
    totalAmount,
  })

  const transaction = await prisma.$transaction(async (tx) => {
    // 1. Buat Transaction (DRAFT)
    const trx = await tx.transaction.create({
      data: {
        code,
        customerId: customerId ?? null,
        userId,
        subtotal,
        discountAmount,
        packingFee: 0,
        totalAmount,
        paidAmount: 0,
        paymentMethod: "CASH",  // default, akan diubah saat konfirmasi
        paymentStatus: "UNPAID",
        confirmationStatus: "DRAFT",
        notes: notes ?? null,
      },
    })

    // 2. Buat TransactionItems
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

      // 3. Reserve stok secara atomik untuk mencegah race condition
      const updated = await tx.$executeRawUnsafe<number>(
        `UPDATE "products"
         SET "reservedStock" = "reservedStock" + $1
         WHERE "id" = $2
           AND ("stock" - "reservedStock") >= $1`,
        item.quantity,
        item.productId
      )
      if (updated === 0) {
        throw new ValidationError(`Stok tidak cukup saat reservasi. Produk: ${product.name}`)
      }
    }

    log.info("[POS]", "Draft created", { code, transactionId: trx.id, itemCount: items.length })
    return trx
  })

  return prisma.transaction.findUniqueOrThrow({
    where: { id: transaction.id },
    include: {
      items: { include: { product: { select: { name: true, code: true, unit: true } } } },
      customer: { select: { id: true, name: true } },
    },
  })
}

// ─── Confirm Transaction ──────────────────────────────────────────────────────
// Konfirmasi DRAFT: input paidAmount + packingFee, kurangi stock, catat ledger/hutang

export async function confirmTransaction(
  transactionId: string,
  payload: ConfirmTransactionInput,
  userId: string
) {
  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { items: true },
  })
  if (!existing) throw new NotFoundError("Transaksi")
  if (existing.confirmationStatus !== "DRAFT") {
    throw new ConflictError(
      existing.confirmationStatus === "CONFIRMED"
        ? "Transaksi sudah dikonfirmasi"
        : "Transaksi sudah dibatalkan"
    )
  }

  const {
    paidAmount, paymentMethod, packingFee = 0,
    overpayAction,
    notes, items: updatedItems, discountAmount: updatedDiscount,
  } = payload
  const eventBaseTime = new Date()

  const originalQtyByProduct = existing.items.reduce<Record<string, number>>((acc, item) => {
    acc[item.productId] = (acc[item.productId] ?? 0) + item.quantity
    return acc
  }, {})

  // Gunakan items yang diupdate jika ada, atau items lama
  const finalItems = updatedItems
    ? updatedItems.map((ui) => {
        return { ...ui, originalQty: originalQtyByProduct[ui.productId] ?? 0 }
      })
    : existing.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        sellPrice: Number(i.sellPrice),
        discountAmount: Number(i.discountAmount),
        originalQty: i.quantity,
      }))

  // Validasi stok jika ada perubahan qty
  if (updatedItems) {
    for (const item of finalItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { stock: true, reservedStock: true, name: true },
      })
      if (!product) throw new ValidationError(`Produk tidak ditemukan`)
      // available = stock - reservedStock + originalQty (karena originalQty sudah di-reserve)
      const available = product.stock - product.reservedStock + item.originalQty
      if (available < item.quantity) {
        throw new ValidationError(
          `Stok ${product.name} tidak cukup. Tersedia: ${available}, diminta: ${item.quantity}`
        )
      }
    }
  }

  const finalDiscount = updatedDiscount ?? Number(existing.discountAmount)
  const subtotal = finalItems.reduce(
    (sum, item) => sum + (item.sellPrice - item.discountAmount) * item.quantity,
    0
  )
  const customerId = existing.customerId

  const totalAmount = subtotal - finalDiscount + packingFee
  const availableDeposit = customerId
    ? await prisma.deposit.aggregate({
      where: { partyType: "CUSTOMER", partyId: customerId, balance: { gt: 0 } },
      _sum: { balance: true },
    })
    : null
  const autoDepositUsed = customerId ? Math.min(totalAmount, Number(availableDeposit?._sum.balance ?? 0)) : 0
  const effectivePaid = paidAmount + autoDepositUsed
  const paymentAppliedToInvoice = Math.min(totalAmount, effectivePaid)
  const debtAmount = Math.max(0, totalAmount - effectivePaid)
  const overpayAmount = Math.max(0, effectivePaid - totalAmount)
  const paymentStatus = effectivePaid >= totalAmount ? "PAID" : effectivePaid > 0 ? "PARTIAL" : "UNPAID"

  // Validasi walk-in tidak boleh hutang
  if (!customerId && debtAmount > 0) {
    throw new ValidationError("Customer walk-in harus membayar lunas")
  }

  log.debug("[POS]", "Confirming transaction", {
    transactionId,
    code: existing.code,
    customerId: customerId ?? "walk-in",
    subtotal,
    discountAmount: finalDiscount,
    packingFee,
    totalAmount,
    paidAmount,
    depositUsed: autoDepositUsed,
    effectivePaid,
    debtAmount,
    overpayAmount,
    paymentStatus,
    case: effectivePaid === 0
      ? "HUTANG_SEMUA"
      : effectivePaid >= totalAmount && overpayAmount === 0
      ? "LUNAS"
      : effectivePaid > totalAmount
      ? `OVERPAY (action=${overpayAction})`
      : "PARTIAL",
  })

  const transaction = await prisma.$transaction(async (tx) => {
    // 1. Update Transaction
    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        subtotal,
        discountAmount: finalDiscount,
        packingFee,
        totalAmount,
        paidAmount,
        paymentMethod,
        paymentStatus,
        confirmationStatus: "CONFIRMED",
        confirmedAt: eventBaseTime,
        confirmedBy: userId,
        transactionDate: eventBaseTime,
        notes: notes ?? existing.notes,
        changeAmount: 0,
        debtAmount,
        depositUsed: autoDepositUsed,
      },
    })

    // 2. Update items jika ada perubahan
    if (updatedItems) {
      // Hapus items lama
      await tx.transactionItem.deleteMany({ where: { transactionId } })
      // Buat items baru
      for (const item of finalItems) {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: item.productId },
          select: { name: true, buyPrice: true },
        })
        await tx.transactionItem.create({
          data: {
            transactionId,
            productId: item.productId,
            productName: product.name,
            quantity: item.quantity,
            sellPrice: item.sellPrice,
            buyPrice: product.buyPrice,
            discountAmount: item.discountAmount,
            subtotal: (item.sellPrice - item.discountAmount) * item.quantity,
          },
        })
      }
    }

    // 3. Kurangi stock + lepas reservedStock, buat StockMovement
    for (const item of finalItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          reservedStock: { decrement: item.originalQty },  // lepas reserve lama
        },
      })
      await createMovement(tx, {
        productId: item.productId,
        type: "SALE_OUT",
        quantity: -item.quantity,
        referenceCode: existing.code,
        transactionId,
      })
    }

    // 4. LedgerEntry untuk customer (jika ada)
    if (customerId) {
      const invoiceDate = new Date(eventBaseTime.getTime())
      await addEntry({
        partyType: "CUSTOMER",
        partyId: customerId,
        type: "INVOICE",
        direction: "DEBIT",
        amount: totalAmount,
        description: `Penjualan ${existing.code}`,
        referenceType: "TRANSACTION",
        referenceId: transactionId,
        createdBy: userId,
        createdAt: invoiceDate,
      }, tx)

      if (paymentAppliedToInvoice > 0) {
        const paymentDate = new Date(eventBaseTime.getTime() + 1)
        await addEntry({
          partyType: "CUSTOMER",
          partyId: customerId,
          type: "PAYMENT_IN",
          direction: "CREDIT",
          amount: paymentAppliedToInvoice,
          description: `Bayar ${existing.code}`,
          paymentMethod,
          referenceType: "TRANSACTION",
          referenceId: transactionId,
          createdBy: userId,
          createdAt: paymentDate,
        }, tx)
      }

    }

    // 5. Buat Debt jika ada
    if (debtAmount > 0 && customerId) {
      const debtDate = new Date(eventBaseTime.getTime() + 2)
      await tx.debt.create({
        data: {
          customerId,
          transactionId,
          originalAmount: debtAmount,
          remainingAmount: debtAmount,
          status: effectivePaid <= 0 ? "UNPAID" : "PARTIAL",
          debtDate,
        },
      })
    }

    // 6. Handle overpay
    let finalChangeAmount = 0
    let depositCreated = 0

    if (overpayAmount > 0 && customerId) {
      const hasOldDebt = await hasOutstandingDebt(customerId)
      if (hasOldDebt) {
        await allocatePaymentFifo(customerId, overpayAmount, transactionId, undefined, tx)
      } else if (overpayAction === "deposit") {
        depositCreated = overpayAmount
        await createDeposit(
          "CUSTOMER",
          customerId,
          overpayAmount,
          "OVERPAY_TRANSACTION",
          transactionId,
          userId,
          `Kelebihan bayar ${existing.code}`,
          tx
        )
      } else {
        finalChangeAmount = overpayAmount
      }
    } else if (overpayAmount > 0) {
      finalChangeAmount = overpayAmount
    }

    // 7. Update changeAmount + depositCreated
    const finalTrx = await tx.transaction.update({
      where: { id: transactionId },
      data: { changeAmount: finalChangeAmount, depositCreated },
    })

    // 8. Pakai deposit otomatis FIFO jika tersedia
    if (autoDepositUsed > 0 && customerId) {
      await useDepositFifo(
        "CUSTOMER",
        customerId,
        autoDepositUsed,
        "TRANSACTION",
        transactionId,
        userId,
        { writeLedger: false },
        tx
      )
    }

    log.info("[POS]", "Transaction confirmed", {
      code: existing.code,
      transactionId,
      totalAmount,
      paidAmount,
      packingFee,
      debtAmount,
      changeAmount: finalChangeAmount,
      paymentStatus,
    })

    return finalTrx
  })

  return prisma.transaction.findUniqueOrThrow({
    where: { id: transaction.id },
    include: {
      items: { include: { product: { select: { name: true, code: true, unit: true } } } },
      customer: { select: { id: true, name: true } },
      debt: true,
    },
  })
}

// ─── Cancel Draft ─────────────────────────────────────────────────────────────
// Batalkan DRAFT: lepas reservedStock, tidak ada efek lain

export async function cancelDraft(transactionId: string, userId: string) {
  const existing = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { items: true },
  })
  if (!existing) throw new NotFoundError("Transaksi")
  if (existing.confirmationStatus !== "DRAFT") {
    throw new ConflictError(
      existing.confirmationStatus === "CONFIRMED"
        ? "Transaksi sudah dikonfirmasi, tidak bisa dibatalkan"
        : "Transaksi sudah dibatalkan"
    )
  }

  await prisma.$transaction(async (tx) => {
    // Lepas reservedStock untuk semua item
    for (const item of existing.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { reservedStock: { decrement: item.quantity } },
      })
    }

    // Tandai CANCELLED
    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        confirmationStatus: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: userId,
      },
    })
  })

  log.info("[POS]", "Draft cancelled", { transactionId, code: existing.code })
  return { success: true, code: existing.code }
}

// ─── Legacy processCheckout (backward compat) ─────────────────────────────────
// Dipertahankan untuk kompatibilitas — langsung create + confirm dalam satu step

export async function processCheckout(payload: import("../schemas/pos.schema").CheckoutInput, userId: string) {
  // Buat draft dulu
  const draft = await createDraft({
    customerId: payload.customerId,
    items: payload.items,
    discountAmount: payload.discountAmount,
    notes: payload.notes,
  }, userId)

  // Langsung konfirmasi
  return confirmTransaction(draft.id, {
    paidAmount: payload.paidAmount,
    paymentMethod: payload.paymentMethod,
    packingFee: 0,
    overpayAction: payload.overpayAction,
    depositUsed: payload.depositUsed,
    depositId: payload.depositId,
  }, userId)
}
