"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { DebtTable } from "@/features/debts/components/DebtTable"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebounce } from "@/hooks/useDebounce"
import { useToast } from "@/hooks/useToast"
import { Clock, Users, TrendingDown, ChevronRight, Banknote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DebtPaymentForm } from "@/features/debts/components/DebtPaymentForm"
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
  transaction: { code: string }
}

interface CustomerSummary {
  id: string
  name: string
  phone: string | null
  totalRemaining: number
  debtCount: number
}

export default function DebtsPage() {
  const router = useRouter()
  const toast = useToast()

  // State untuk tab "Semua Hutang"
  const [debts, setDebts] = useState<DebtRow[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: "", status: "" })
  const debouncedSearch = useDebounce(filters.search, 400)

  // State untuk tab "Per Customer"
  const [customerSummaries, setCustomerSummaries] = useState<CustomerSummary[]>([])
  const [isSummaryLoading, setIsSummaryLoading] = useState(true)
  const [totalOutstanding, setTotalOutstanding] = useState(0)
  const [oldestDays, setOldestDays] = useState<number | null>(null)

  // Payment form
  const [payTarget, setPayTarget] = useState<{ id: string; name: string } | null>(null)

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
    } catch {
      toast.error("Gagal memuat data hutang")
    } finally {
      setIsLoading(false)
    }
  }, [page, filters.status, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSummary = useCallback(async () => {
    setIsSummaryLoading(true)
    try {
      // Ambil semua hutang aktif untuk summary per customer
      const res = await fetch("/api/debts?status=active&limit=200")
      const json = await res.json()
      const allDebts: DebtRow[] = json.data ?? []

      // Group by customer
      const map = new Map<string, CustomerSummary>()
      for (const d of allDebts) {
        const existing = map.get(d.customerId)
        if (existing) {
          existing.totalRemaining += Number(d.remainingAmount)
          existing.debtCount += 1
        } else {
          map.set(d.customerId, {
            id: d.customerId,
            name: d.customer.name,
            phone: d.customer.phone,
            totalRemaining: Number(d.remainingAmount),
            debtCount: 1,
          })
        }
      }

      const summaries = Array.from(map.values()).sort((a, b) => b.totalRemaining - a.totalRemaining)
      setCustomerSummaries(summaries)
      setTotalOutstanding(summaries.reduce((s, c) => s + c.totalRemaining, 0))

      if (allDebts.length > 0) {
        const maxDays = Math.max(...allDebts.map((d) =>
          Math.floor((Date.now() - new Date(d.debtDate).getTime()) / 86400000)
        ))
        setOldestDays(maxDays)
      }
    } catch {
      toast.error("Gagal memuat ringkasan hutang")
    } finally {
      setIsSummaryLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDebts() }, [fetchDebts])
  useEffect(() => { fetchSummary() }, [fetchSummary])
  useEffect(() => { setPage(1) }, [filters.status, debouncedSearch])

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function handlePaymentSuccess() {
    setPayTarget(null)
    fetchDebts()
    fetchSummary()
  }

  const customerColumns: Column<CustomerSummary>[] = [
    {
      header: "Customer",
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.name}</p>
          {row.phone && <p className="text-xs text-muted-foreground">{row.phone}</p>}
        </div>
      ),
    },
    {
      header: "Hutang Aktif",
      render: (row) => <span className="text-sm">{row.debtCount} transaksi</span>,
    },
    {
      header: "Total Hutang",
      render: (row) => (
        <CurrencyDisplay amount={row.totalRemaining} className="text-sm font-bold text-red-600" />
      ),
    },
    {
      header: "",
      className: "w-[160px] text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setPayTarget({ id: row.id, name: row.name })}
          >
            <Banknote className="h-3.5 w-3.5" />
            Bayar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => router.push(`/debts/${row.id}`)}
          >
            Detail
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <PageWrapper title="Hutang Customer">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
            <TrendingDown className="h-3.5 w-3.5" />
            Total Outstanding
          </div>
          <CurrencyDisplay amount={totalOutstanding} className="text-2xl font-bold text-red-600" />
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
            <Users className="h-3.5 w-3.5" />
            Customer Berpiutang
          </div>
          <p className="text-2xl font-bold">{customerSummaries.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
            <Clock className="h-3.5 w-3.5" />
            Hutang Terlama
          </div>
          <p className="text-2xl font-bold">
            {oldestDays !== null ? `${oldestDays} hari` : "—"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">Per Customer</TabsTrigger>
          <TabsTrigger value="all">Semua Hutang</TabsTrigger>
        </TabsList>

        {/* Tab: Per Customer */}
        <TabsContent value="customers" className="mt-4">
          {isSummaryLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : customerSummaries.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center">
              <p className="text-sm text-muted-foreground">Tidak ada hutang aktif</p>
            </div>
          ) : (
            <DataTable
              columns={customerColumns}
              data={customerSummaries}
              isLoading={isSummaryLoading}
              emptyMessage="Tidak ada hutang aktif"
              keyExtractor={(row) => row.id}
            />
          )}
        </TabsContent>

        {/* Tab: Semua Hutang */}
        <TabsContent value="all" className="mt-4">
          <DebtTable
            data={debts}
            meta={meta}
            isLoading={isLoading}
            isGlobal={true}
            filters={filters}
            onFilterChange={setFilter}
            onPageChange={setPage}
            onRefetch={() => { fetchDebts(); fetchSummary() }}
          />
        </TabsContent>
      </Tabs>

      {payTarget && (
        <DebtPaymentForm
          open={!!payTarget}
          onOpenChange={(open) => !open && setPayTarget(null)}
          customerId={payTarget.id}
          customerName={payTarget.name}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </PageWrapper>
  )
}
