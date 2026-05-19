import type { PrismaClient } from "@/generated/prisma"
import { prisma as globalPrisma } from "@/lib/prisma"
import { ConflictError, NotFoundError, ValidationError } from "@/lib/exceptions"
import { addEntry } from "@/features/ledger/services/ledger.service"
import { log } from "@/lib/logger"

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">

export async function getVendorOutstandingDebts(vendorId: string) {
  return globalPrisma.vendorDebt.findMany({
    where: { vendorId, status: { in: ["UNPAID", "PARTIAL"] } },
    include: { purchase: { select: { code: true } } },
    orderBy: { debtDate: "asc" },
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
    include: { purchase: { select: { code: true } } },
    orderBy: { debtDate: "asc" },
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
  if (totalPayment > totalOutstanding) {
    throw new ValidationError(`Nominal melebihi total hutang. Maksimal: Rp ${totalOutstanding.toLocaleString("id-ID")}`)
  }

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

    let remaining = totalPayment

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

    // LedgerEntry: PAYMENT_OUT CREDIT (toko bayar ke vendor)
    await addEntry({
      partyType: "VENDOR",
      partyId: vendorId,
      type: "PAYMENT_OUT",
      direction: "CREDIT",
      amount: totalPayment,
      description: "Bayar hutang vendor (FIFO)",
      paymentMethod,
      referenceType: "VENDOR_PAYMENT",
      referenceId: vendorPayment.id,
      notes,
      createdBy,
    }, tx)

    return vendorPayment
  })
}

// Bayar hutang vendor — per invoice spesifik
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

  if (amount > Number(debt.remainingAmount)) {
    throw new ValidationError(
      `Nominal melebihi sisa hutang. Maksimal: Rp ${Number(debt.remainingAmount).toLocaleString("id-ID")}`
    )
  }

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
        amount,
        source: "DIRECT",
        notes: notes ?? null,
        vendorPaymentId: vendorPayment.id,
      },
    })

    const newRemaining = Number(debt.remainingAmount) - amount
    const willBeFullyPaid = newRemaining <= 0

    await tx.vendorDebt.update({
      where: { id: vendorDebtId },
      data: {
        paidAmount: { increment: amount },
        remainingAmount: { decrement: amount },
        status: willBeFullyPaid ? "PAID" : "PARTIAL",
        settledAt: willBeFullyPaid ? new Date() : null,
      },
    })

    await addEntry({
      partyType: "VENDOR",
      partyId: debt.vendorId,
      type: "PAYMENT_OUT",
      direction: "CREDIT",
      amount,
      description: `Bayar hutang PO ${debt.purchase.code}`,
      paymentMethod,
      referenceType: "VENDOR_PAYMENT",
      referenceId: vendorPayment.id,
      notes,
      createdBy,
    }, tx)

    log.info("[VENDOR_DEBT]", "Invoice payment processed", {
      vendorDebtId,
      purchaseCode: debt.purchase.code,
      amount,
      willBeFullyPaid,
    })

    return vendorPayment
  })
}
