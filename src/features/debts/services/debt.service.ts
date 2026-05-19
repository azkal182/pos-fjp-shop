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
): Promise<AllocationResult> {
  const db = tx ?? globalPrisma

  const debts = await db.debt.findMany({
    where: { customerId, status: { in: ["UNPAID", "PARTIAL"] } },
    orderBy: { debtDate: "asc" },
    include: { transaction: { select: { code: true } } },
  })

  let remaining = totalPayment
  const allocations: DebtAllocation[] = []

  log.info("[DEBT]", "FIFO allocation started", {
    customerId,
    totalPayment,
    debtsCount: debts.length,
  })

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

    // Buat DebtPayment record
    await db.debtPayment.create({
      data: {
        debtId: debt.id,
        amount: allocatedAmount,
        source: sourceTransactionId ? "POS_OVERPAYMENT" : "DIRECT",
        sourceTransactionId: sourceTransactionId ?? null,
        notes: notes ?? null,
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
    })

    remaining -= allocatedAmount
  }

  return {
    allocations,
    totalAllocated: totalPayment - remaining,
    remainingChange: remaining,
  }
}
