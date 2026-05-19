"use client"

import { useEffect, useState } from "react"
import { classifyDebtClient, type AgingCategory } from "../utils/aging.utils"

// Cache sederhana di module level agar tidak fetch berulang
let cachedCategories: AgingCategory[] | null = null

async function fetchCategories(): Promise<AgingCategory[]> {
  if (cachedCategories) return cachedCategories
  const res = await fetch("/api/debt-aging-categories")
  const json = await res.json()
  cachedCategories = json.data ?? []
  return cachedCategories!
}

interface DebtAgingBadgeProps {
  debtDate: Date | string
  categories?: AgingCategory[]
}

export function DebtAgingBadge({ debtDate, categories: propCategories }: DebtAgingBadgeProps) {
  const [categories, setCategories] = useState<AgingCategory[]>(propCategories ?? [])

  useEffect(() => {
    if (propCategories) {
      setCategories(propCategories)
      return
    }
    fetchCategories().then(setCategories).catch(() => {})
  }, [propCategories])

  const result = classifyDebtClient(debtDate, categories)

  if (!result) {
    return (
      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400">
        Tidak Dikategorikan
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${result.color}20`,
        borderColor: `${result.color}60`,
        color: result.color,
      }}
    >
      {result.category.name}
      <span className="opacity-70">({result.daysDiff}h)</span>
    </span>
  )
}
