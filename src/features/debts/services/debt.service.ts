import type { PrismaClient } from "@/generated/prisma"
import { prisma as globalPrisma } from "@/lib/prisma"
import { log } from "@/lib/logger"
import type { AllocationResult, DebtAllocation, FifoPreview } from "../types/debt.types"

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>

export async function hasOutstandingDebt(customerId: string): Promise<boolean> {
  const count = await globalPrisma.debt.count({
    where: { customerId, status: { in: ["UNPAID", "PARTIAL"] } },
  })
  return count > 0
}

export async function getOutstandingDebts(customerId: string) {
  return globalPrisma.debt.findMany({
    where: { customerId, status: { in: ["UNPAID", "PARTIAL"] } },
    orderBy: { debtDate: "asc" },
    include: { transaction: { select: { code: true } } },
  })
}

export async function previewFifoAllocation(
  customerId: string,
  totalPayment: number
): Promise<FifoPreview> {
  const debts = await getOutstandingDebts(customerId)

  let remaining = totalPayment
  const allocations: DebtAllocation[] = []

  for (const debt of debts) {
    if (remaining <= 0) break
    const currentRemaining = Number(debt.remainingAmount)
    const allocatedAmount = Math.min(remaining, currentRemaining)
    const willBeFullyPaid = allocatedAmount >= currentRemaining

    allocations.push({
      debtId: debt.id,
      debtCode: debt.transaction.code,
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

export async function allocatePaymentFifo(
  customerId: string,
  totalPayment: number,
  sourceTransactionId?: string,
  notes?: string,
  tx?: TxClient
): Promise<AllocationResult & { customerPaymentId: string }> {
  const db = tx ?? globalPrisma

  const debts = await db.debt.findMany({
    where: { customerId, status: { in: ["UNPAID", "PARTIAL"] } },
    orderBy: { debtDate: "asc" },
    include: { transaction: { select: { code: true } } },
  })

  const source = sourceTransactionId ? "POS_OVERPAYMENT" : "DIRECT"

  log.info("[DEBT]", "FIFO allocation started", {
    customerId,
    totalPayment,
    source,
    debtsCount: debts.length,
  })

  // 1. Buat CustomerPayment header — 1 record per event bayar
  const customerPayment = await db.customerPayment.create({
    data: {
      customerId,
      amount: totalPayment,
      source,
      notes: notes ?? null,
      sourceTransactionId: sourceTransactionId ?? null,
    },
  })

  let remaining = totalPayment
  const allocations: DebtAllocation[] = []

  // 2. Alokasi FIFO ke hutang-hutang
  for (const debt of debts) {
    if (remaining <= 0) break

    const currentRemaining = Number(debt.remainingAmount)
    const allocatedAmount = Math.min(remaining, currentRemaining)
    const willBeFullyPaid = allocatedAmount >= currentRemaining

    allocations.push({
      debtId: debt.id,
      debtCode: debt.transaction.code,
      debtDate: debt.debtDate,
      originalAmount: Number(debt.originalAmount),
      currentRemaining,
      allocatedAmount,
      willBeFullyPaid,
      remainingAfter: willBeFullyPaid ? 0 : currentRemaining - allocatedAmount,
    })

    // Buat DebtPayment — linked ke CustomerPayment header
    await db.debtPayment.create({
      data: {
        debtId: debt.id,
        amount: allocatedAmount,
        source,
        sourceTransactionId: sourceTransactionId ?? null,
        notes: notes ?? null,
        customerPaymentId: customerPayment.id,
      },
    })

    // Update Debt
    await db.debt.update({
      where: { id: debt.id },
      data: {
        paidAmount: { increment: allocatedAmount },
        remainingAmount: { decrement: allocatedAmount },
        status: willBeFullyPaid ? "PAID" : "PARTIAL",
        settledAt: willBeFullyPaid ? new Date() : null,
      },
    })

    log.info("[DEBT]", "Allocated to debt", {
      debtId: debt.id,
      debtCode: debt.transaction.code,
      allocatedAmount,
      willBeFullyPaid,
      customerPaymentId: customerPayment.id,
    })

    remaining -= allocatedAmount
  }

  return {
    allocations,
    totalAllocated: totalPayment - remaining,
    remainingChange: remaining,
    customerPaymentId: customerPayment.id,
  }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export async function getCustomerPayments(customerId: string) {
  return globalPrisma.customerPayment.findMany({
    where: { customerId },
    include: {
      allocations: {
        include: {
          debt: {
            select: {
              id: true,
              originalAmount: true,
              remainingAmount: true,
              status: true,
              transaction: { select: { code: true } },
            },
          },
        },
      },
      sourceTransaction: { select: { code: true } },
    },
    orderBy: { paymentDate: "desc" },
  })
}

export async function getCustomerLedger(customerId: string) {
  // Ambil semua hutang dan semua pembayaran, gabungkan jadi ledger
  const [debts, payments] = await Promise.all([
    globalPrisma.debt.findMany({
      where: { customerId },
      include: { transaction: { select: { code: true, transactionDate: true } } },
      orderBy: { debtDate: "asc" },
    }),
    globalPrisma.customerPayment.findMany({
      where: { customerId },
      include: {
        allocations: {
          include: {
            debt: { select: { transaction: { select: { code: true } } } },
          },
        },
        sourceTransaction: { select: { code: true } },
      },
      orderBy: { paymentDate: "asc" },
    }),
  ])

  type LedgerEntry = {
    date: Date
    type: "DEBT" | "PAYMENT"
    description: string
    debit: number    // hutang masuk (+)
    credit: number   // pembayaran (-)
    reference: string
    id: string
    meta?: any
  }

  const entries: LedgerEntry[] = []

  // Hutang = debit (menambah saldo hutang)
  for (const debt of debts) {
    entries.push({
      date: debt.debtDate,
      type: "DEBT",
      description: `Hutang dari transaksi ${debt.transaction.code}`,
      debit: Number(debt.originalAmount),
      credit: 0,
      reference: debt.transaction.code,
      id: debt.id,
    })
  }

  // Pembayaran = kredit (mengurangi saldo hutang)
  for (const payment of payments) {
    const sourceLabel =
      payment.source === "POS_OVERPAYMENT"
        ? `Overpay POS ${payment.sourceTransaction?.code ?? ""}`
        : "Pembayaran langsung"

    entries.push({
      date: payment.paymentDate,
      type: "PAYMENT",
      description: sourceLabel,
      debit: 0,
      credit: Number(payment.amount),
      reference: payment.id,
      id: payment.id,
      meta: {
        notes: payment.notes,
        allocations: payment.allocations.map((a) => ({
          debtCode: a.debt.transaction.code,
          amount: Number(a.amount),
        })),
      },
    })
  }

  // Sort by date asc
  entries.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Hitung running balance
  let balance = 0
  const ledger = entries.map((entry) => {
    balance += entry.debit - entry.credit
    return { ...entry, balance }
  })

  return {
    ledger,
    totalDebt: debts.reduce((s, d) => s + Number(d.originalAmount), 0),
    totalPaid: payments.reduce((s, p) => s + Number(p.amount), 0),
    currentBalance: balance,
  }
}
