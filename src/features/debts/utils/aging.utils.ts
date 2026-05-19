/**
 * Pure client-safe utility — tidak mengimport prisma atau server modules.
 * Bisa digunakan di Client Components.
 */
import { differenceInDays } from "date-fns"

export interface AgingCategory {
  id: string
  name: string
  minDays: number
  maxDays: number | null
  color: string
  order: number
}

export interface AgingResult {
  category: AgingCategory
  daysDiff: number
  color: string
}

export function classifyDebtClient(
  debtDate: Date | string,
  categories: AgingCategory[]
): AgingResult | null {
  const daysDiff = differenceInDays(new Date(), new Date(debtDate))

  for (const cat of categories) {
    const withinMin = daysDiff >= cat.minDays
    const withinMax = cat.maxDays === null || daysDiff <= cat.maxDays
    if (withinMin && withinMax) {
      return { category: cat, daysDiff, color: cat.color }
    }
  }
  return null
}
