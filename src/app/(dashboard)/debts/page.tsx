"use client"

import { useState, useEffect, useCallback } from "react"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { DebtTable } from "@/features/debts/components/DebtTable"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { useDebounce } from "@/hooks/useDebounce"
import { useToast } from "@/hooks/useToast"
import { Clock, Users, TrendingDown } from "lucide-react"
import type { PaginationMeta } from "@/types"

interface DebtRow {
  id: string
  customerId: string
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  status: string
  debtDate: Date | string
  aging: any
  customer: { id: string; name: string; phone: string | null }
  transaction: { code: string; id?: string }
}

interface DebtSummary {
  totalOutstanding: number
  customersWithDebt: number
  oldestDays: number | null
}

export default function DebtsPage() {
  const toast = useToast()
  const [debts, setDebts] = useState<DebtRow[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [summary, setSummary] = useState<DebtSummary>({ totalOutstanding: 0, customersWithDebt: 0, oldestDays: null })
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: "", status: "" })
  const debouncedSearch = useDebounce(filters.search, 400)

  const fetchDebts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      if (filters.status) params.set("status", filters.status)
      if (debouncedSearch) params.set("customerId", debouncedSearch)
      const res = await fetch(`/api/debts?${params}`)
      const json = await res.json()
      setDebts(json.data ?? [])
      setMeta(json.meta)

      const allDebts = json.data ?? []
      const outstanding = allDebts.reduce((s: number, d: DebtRow) => s + Number(d.remainingAmount), 0)
      const uniqueCustomers = new Set(allDebts.map((d: DebtRow) => d.customerId)).size
      const oldest = allDebts.length > 0
        ? Math.max(...allDebts.map((d: DebtRow) =>
            Math.floor((Date.now() - new Date(d.debtDate).getTime()) / 86400000)
          ))
        : null
      setSummary({ totalOutstanding: outstanding, customersWithDebt: uniqueCustomers, oldestDays: oldest })
    } catch {
      toast.error("Gagal memuat data hutang")
    } finally {
      setIsLoading(false)
    }
  }, [page, filters.status, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDebts() }, [fetchDebts])
  useEffect(() => { setPage(1) }, [filters.status, debouncedSearch])

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <PageWrapper title="Hutang Customer">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
            <TrendingDown className="h-3.5 w-3.5" />
            Total Outstanding
          </div>
          <CurrencyDisplay amount={summary.totalOutstanding} className="text-2xl font-bold text-red-600" />
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
            <Users className="h-3.5 w-3.5" />
            Customer Berpiutang
          </div>
          <p className="text-2xl font-bold">{summary.customersWithDebt}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
            <Clock className="h-3.5 w-3.5" />
            Hutang Terlama
          </div>
          <p className="text-2xl font-bold">
            {summary.oldestDays !== null ? `${summary.oldestDays} hari` : "—"}
          </p>
        </div>
      </div>

      {/* DebtTable dengan tabs built-in */}
      <DebtTable
        data={debts}
        meta={meta}
        isLoading={isLoading}
        isGlobal={true}
        filters={filters}
        onFilterChange={setFilter}
        onPageChange={setPage}
        onRefetch={fetchDebts}
      />
    </PageWrapper>
  )
}
