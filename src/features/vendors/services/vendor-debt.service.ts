import { prisma as globalPrisma } from "@/lib/prisma"
import { ConflictError, NotFoundError } from "@/lib/exceptions"
import { addEntry } from "@/features/ledger/services/ledger.service"
import { createDeposit } from "@/features/deposits/services/deposit.service"
import { log } from "@/lib/logger"

export async function getVendorOutstandingDebts(vendorId: string) {
  return globalPrisma.vendorDebt.findMany({
    where: { vendorId, status: { in: ["UNPAID", "PARTIAL"] } },
    include: { purchase: { select: { code: true, purchaseDate: true } } },
    // FIFO: terlama dulu. Gunakan createdAt sebagai tiebreaker agar deterministik
    // ketika beberapa PO punya debtDate yang sama (misal: pembelian di hari yang sama).
    orderBy: [{ debtDate: "asc" }, { createdAt: "asc" }],
  })
}

export async function getTotalVendorOutstanding(vendorId: string): Promise<number> {
  const result = await globalPrisma.vendorDebt.aggregate({
    where: { vendorId, status: { in: ["UNPAID", "PARTIAL"] } },
    _sum: { remainingAmount: true },
  })
  return Number(result._sum.remainingAmount ?? 0)
}

export async function hasVendorOutstandingDebt(vendorId: string): Promise<boolean> {
  const count = await globalPrisma.vendorDebt.count({
    where: { vendorId, status: { in: ["UNPAID", "PARTIAL"] } },
  })
  return count > 0
}

export async function getVendorDebtSummary(vendorId: string) {
  const debts = await globalPrisma.vendorDebt.findMany({
    where: { vendorId, status: { in: ["UNPAID", "PARTIAL"] } },
    include: { purchase: { select: { code: true, purchaseDate: true } } },
    orderBy: [{ debtDate: "asc" }, { createdAt: "asc" }],
  })

  const totalOutstanding = debts.reduce((s, d) => s + Number(d.remainingAmount), 0)
  const oldestDebt = debts[0]
  const oldestDays = oldestDebt
    ? Math.floor((Date.now() - new Date(oldestDebt.debtDate).getTime()) / 86400000)
    : null

  return {
    totalOutstanding,
    activeDebtsCount: debts.length,
    oldestDays,
    debts,
  }
}

// Preview FIFO tanpa simpan
export async function previewFifoAllocation(vendorId: string, totalPayment: number) {
  const debts = await getVendorOutstandingDebts(vendorId)
  let remaining = totalPayment
  const allocations = []

  for (const debt of debts) {
    if (remaining <= 0) break
    const currentRemaining = Number(debt.remainingAmount)
    const allocatedAmount = Math.min(remaining, currentRemaining)
    const willBeFullyPaid = allocatedAmount >= currentRemaining

    allocations.push({
      debtId: debt.id,
      purchaseCode: debt.purchase.code,
      debtDate: debt.debtDate,
      originalAmount: Number(debt.originalAmount),
      currentRemaining,
      allocatedAmount,
      willBeFullyPaid,
      remainingAfter: willBeFullyPaid ? 0 : currentRemaining - allocatedAmount,
    })
    remaining -= allocatedAmount
  }

  return {
    allocations,
    totalAllocated: totalPayment - remaining,
    remainingChange: remaining,
  }
}

// Bayar hutang vendor — FIFO
// Jika amount > totalOutstanding, kelebihan otomatis jadi deposit vendor
export async function allocatePaymentFifo(
  vendorId: string,
  totalPayment: number,
  paymentMethod: "CASH" | "TRANSFER",
  createdBy: string,
  notes?: string
) {
  const debts = await getVendorOutstandingDebts(vendorId)
  if (debts.length === 0) throw new ConflictError("Vendor tidak memiliki hutang outstanding")

  const totalOutstanding = await getTotalVendorOutstanding(vendorId)
  const overpayAmount = Math.max(0, totalPayment - totalOutstanding)
  const effectivePayment = Math.min(totalPayment, totalOutstanding)

  return globalPrisma.$transaction(async (tx) => {
    // Buat VendorPayment header
    const vendorPayment = await tx.vendorPayment.create({
      data: {
        vendorId,
        amount: totalPayment,
        source: "DIRECT",
        paymentMethod,
        notes: notes ?? null,
      },
    })

    let remaining = effectivePayment

    for (const debt of debts) {
      if (remaining <= 0) break
      const currentRemaining = Number(debt.remainingAmount)
      const allocatedAmount = Math.min(remaining, currentRemaining)
      const willBeFullyPaid = allocatedAmount >= currentRemaining

      await tx.vendorDebtPayment.create({
        data: {
          debtId: debt.id,
          amount: allocatedAmount,
          source: "DIRECT",
          notes: notes ?? null,
          vendorPaymentId: vendorPayment.id,
        },
      })

      await tx.vendorDebt.update({
        where: { id: debt.id },
        data: {
          paidAmount: { increment: allocatedAmount },
          remainingAmount: { decrement: allocatedAmount },
          status: willBeFullyPaid ? "PAID" : "PARTIAL",
          settledAt: willBeFullyPaid ? new Date() : null,
        },
      })

      log.info("[VENDOR_DEBT]", "Allocated to vendor debt", {
        debtId: debt.id,
        purchaseCode: debt.purchase.code,
        allocatedAmount,
        willBeFullyPaid,
      })

      remaining -= allocatedAmount
    }

    // LedgerEntry: PAYMENT_OUT CREDIT hanya untuk bagian yang melunasi hutang
    // Jika overpay, bagian kelebihan dicatat terpisah sebagai DEPOSIT_IN
    await addEntry({
      partyType: "VENDOR",
      partyId: vendorId,
      type: "PAYMENT_OUT",
      direction: "CREDIT",
      amount: effectivePayment,  // hanya bagian yang melunasi hutang
      description: "Bayar hutang vendor (FIFO)",
      paymentMethod,
      referenceType: "VENDOR_PAYMENT",
      referenceId: vendorPayment.id,
      notes,
      createdBy,
    }, tx)

    // Jika overpay → kelebihan jadi deposit vendor + ledger DEPOSIT_IN
    if (overpayAmount > 0) {
      await createDeposit(
        "VENDOR",
        vendorId,
        overpayAmount,
        "MANUAL",
        vendorPayment.id,
        createdBy,
        "Kelebihan bayar hutang vendor",
        tx
      )

      log.info("[VENDOR_DEBT]", "Overpay → vendor deposit created", { overpayAmount })
    }

    return { ...vendorPayment, overpayAmount }
  })
}

// Bayar hutang vendor — per invoice spesifik
// Jika amount > remainingAmount, kelebihan otomatis jadi deposit vendor
export async function allocatePaymentToInvoice(
  vendorDebtId: string,
  amount: number,
  paymentMethod: "CASH" | "TRANSFER",
  createdBy: string,
  notes?: string
) {
  const debt = await globalPrisma.vendorDebt.findUnique({
    where: { id: vendorDebtId },
    include: { purchase: { select: { code: true } } },
  })
  if (!debt) throw new NotFoundError("Hutang vendor")
  if (debt.status === "PAID") throw new ConflictError("Hutang ini sudah lunas")

  const remaining = Number(debt.remainingAmount)
  const overpayAmount = Math.max(0, amount - remaining)
  const effectiveAmount = Math.min(amount, remaining)

  return globalPrisma.$transaction(async (tx) => {
    const vendorPayment = await tx.vendorPayment.create({
      data: {
        vendorId: debt.vendorId,
        amount,
        source: "DIRECT",
        paymentMethod,
        notes: notes ?? null,
      },
    })

    await tx.vendorDebtPayment.create({
      data: {
        debtId: vendorDebtId,
        amount: effectiveAmount,
        source: "DIRECT",
        notes: notes ?? null,
        vendorPaymentId: vendorPayment.id,
      },
    })

    const newRemaining = remaining - effectiveAmount
    const willBeFullyPaid = newRemaining <= 0

    await tx.vendorDebt.update({
      where: { id: vendorDebtId },
      data: {
        paidAmount: { increment: effectiveAmount },
        remainingAmount: { decrement: effectiveAmount },
        status: willBeFullyPaid ? "PAID" : "PARTIAL",
        settledAt: willBeFullyPaid ? new Date() : null,
      },
    })

    await addEntry({
      partyType: "VENDOR",
      partyId: debt.vendorId,
      type: "PAYMENT_OUT",
      direction: "CREDIT",
      amount: effectiveAmount,  // hanya bagian yang melunasi hutang
      description: `Bayar hutang PO ${debt.purchase.code}`,
      paymentMethod,
      referenceType: "VENDOR_PAYMENT",
      referenceId: vendorPayment.id,
      notes,
      createdBy,
    }, tx)

    // Jika overpay → kelebihan jadi deposit vendor + ledger DEPOSIT_IN
    if (overpayAmount > 0) {
      await createDeposit(
        "VENDOR",
        debt.vendorId,
        overpayAmount,
        "MANUAL",
        vendorPayment.id,
        createdBy,
        `Kelebihan bayar PO ${debt.purchase.code}`,
        tx
      )

      log.info("[VENDOR_DEBT]", "Invoice overpay → vendor deposit created", { overpayAmount })
    }

    log.info("[VENDOR_DEBT]", "Invoice payment processed", {
      vendorDebtId,
      purchaseCode: debt.purchase.code,
      amount,
      effectiveAmount,
      overpayAmount,
      willBeFullyPaid,
    })

    return { ...vendorPayment, overpayAmount }
  })
}
