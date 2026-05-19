"use client"

import { useState, useEffect, useCallback } from "react"
import { TrendingDown, Users } from "lucide-react"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { VendorDebtTable } from "@/features/vendors/components/VendorDebtTable"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { useToast } from "@/hooks/useToast"
import type { PaginationMeta } from "@/types"

interface VendorDebt {
  id: string
  vendorId: string
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  status: string
  debtDate: string
  vendor: { id: string; name: string; phone: string | null }
  purchase: { code: string }
}

export default function VendorDebtsPage() {
  const toast = useToast()
  const [debts, setDebts] = useState<VendorDebt[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ status: "" })
  const [summary, setSummary] = useState({ totalOutstanding: 0, vendorsWithDebt: 0 })

  const fetchDebts = useCallback(async () => {
    setIsLoading(true)
    try {
      const p = new URLSearchParams()
      p.set("page", String(page))
      if (filters.status) p.set("status", filters.status)
      const res = await fetch(`/api/vendor-debts?${p}`)
      const json = await res.json()
      const data: VendorDebt[] = json.data ?? []
      setDebts(data)
      setMeta(json.meta)

      const outstanding = data.reduce((s, d) => s + Number(d.remainingAmount), 0)
      const uniqueVendors = new Set(data.map((d) => d.vendorId)).size
      setSummary({ totalOutstanding: outstanding, vendorsWithDebt: uniqueVendors })
    } catch {
      toast.error("Gagal memuat data hutang vendor")
    } finally {
      setIsLoading(false)
    }
  }, [page, filters.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDebts() }, [fetchDebts])
  useEffect(() => { setPage(1) }, [filters.status])

  return (
    <PageWrapper title="Hutang ke Vendor">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
            <TrendingDown className="h-3.5 w-3.5" />
            Total Hutang ke Vendor
          </div>
          <CurrencyDisplay amount={summary.totalOutstanding} className="text-2xl font-bold text-red-600" />
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
            <Users className="h-3.5 w-3.5" />
            Vendor Berpiutang
          </div>
          <p className="text-2xl font-bold">{summary.vendorsWithDebt}</p>
        </div>
      </div>

      <VendorDebtTable
        data={debts}
        meta={meta}
        isLoading={isLoading}
        isGlobal={true}
        filters={filters}
        onFilterChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
        onPageChange={setPage}
        onRefetch={fetchDebts}
      />
    </PageWrapper>
  )
}
