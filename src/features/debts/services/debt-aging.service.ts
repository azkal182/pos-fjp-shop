import { prisma } from "@/lib/prisma"
import { differenceInDays } from "date-fns"
import type { DebtAgingCategory } from "@/generated/prisma"
import { classifyDebtClient, type AgingResult } from "../utils/aging.utils"

export async function getAgingCategories(): Promise<DebtAgingCategory[]> {
  return prisma.debtAgingCategory.findMany({ orderBy: { order: "asc" } })
}

// Re-export untuk server-side usage
export { classifyDebtClient as classifyDebt }
export type { AgingResult }

export interface DebtWithAging {
  id: string
  customerId: string
  transactionId: string
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  status: string
  debtDate: Date
  settledAt: Date | null
  aging: AgingResult | null
}

export async function classifyDebts(
  debts: Array<{
    id: string
    customerId: string
    transactionId: string
    originalAmount: any
    paidAmount: any
    remainingAmount: any
    status: string
    debtDate: Date
    settledAt: Date | null
  }>
): Promise<DebtWithAging[]> {
  const categories = await getAgingCategories()
  return debts.map((debt) => ({
    ...debt,
    originalAmount: Number(debt.originalAmount),
    paidAmount: Number(debt.paidAmount),
    remainingAmount: Number(debt.remainingAmount),
    aging: classifyDebtClient(debt.debtDate, categories),
  }))
}
