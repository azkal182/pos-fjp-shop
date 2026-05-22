"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Banknote, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { SearchInput } from "@/components/shared/SearchInput"
import { Pagination } from "@/components/shared/Pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { DebtAgingBadge } from "./DebtAgingBadge"
import { DebtPaymentForm } from "./DebtPaymentForm"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { PaginationMeta } from "@/types"
import type { AgingResult } from "../services/debt-aging.service"

interface DebtRow {
  id: string
  customerId: string
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  status: string
  debtDate: Date | string
  aging: AgingResult | null
  customer: { id: string; name: string; phone: string | null }
  transaction: { code: string; id?: string }
}

interface DebtTableProps {
  data: DebtRow[]
  meta: PaginationMeta
  isLoading?: boolean
  isGlobal?: boolean
  filters: {
    search: string
    status: string
  }
  onFilterChange: (key: string, value: string) => void
  onPageChange: (page: number) => void
  onRefetch: () => void
}

export function DebtTable({
  data, meta, isLoading, isGlobal = true,
  filters, onFilterChange, onPageChange, onRefetch,
}: DebtTableProps) {
  const [payTarget, setPayTarget] = useState<{ id: string; name: string } | null>(null)

  // State untuk tab Ringkasan per Customer (hanya di global view)
  const [summaryData, setSummaryData] = useState<{
    customerId: string; name: string; phone: string | null; totalRemaining: number; debtCount: number
  }[]>([])
  const [summaryMeta, setSummaryMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [summaryPage, setSummaryPage] = useState(1)
  const [summarySearch, setSummarySearch] = useState("")
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)

  const fetchSummary = useCallback(async () => {
    if (!isGlobal) return
    setIsSummaryLoading(true)
    try {
      const p = new URLSearchParams()
      p.set("page", String(summaryPage))
      if (summarySearch) p.set("search", summarySearch)
      const res = await fetch(`/api/debts/summary?${p}`)
      const json = await res.json()
      setSummaryData(json.data ?? [])
      setSummaryMeta(json.meta)
    } catch {} finally {
      setIsSummaryLoading(false)
    }
  }, [isGlobal, summaryPage, summarySearch])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  const columns: Column<DebtRow>[] = [
    ...(isGlobal ? [{
      header: "Customer",
      render: (row: DebtRow) => (
        <div>
          <Link href={`/debts/${row.customer.id}`} className="font-medium text-sm hover:underline">
            {row.customer.name}
          </Link>
          {row.customer.phone && (
            <p className="text-xs text-muted-foreground">{row.customer.phone}</p>
          )}
        </div>
      ),
    }] : []),
    {
      header: "Transaksi",
      render: (row) => (
        <Link href={`/transactions/${row.transaction.id}`} className="font-mono text-xs hover:underline text-primary">
          {row.transaction.code}
        </Link>
      ),
    },
    {
      header: "Tanggal",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.debtDate), "dd MMM yyyy", { locale: idLocale })}
        </span>
      ),
    },
    {
      header: "Aging",
      render: (row) => <DebtAgingBadge debtDate={new Date(row.debtDate)} />,
    },
    {
      header: "Original",
      render: (row) => <CurrencyDisplay amount={row.originalAmount} className="text-sm" />,
    },
    {
      header: "Terbayar",
      render: (row) => <CurrencyDisplay amount={row.paidAmount} className="text-sm text-green-600" />,
    },
    {
      header: "Sisa",
      render: (row) => (
        <CurrencyDisplay
          amount={row.remainingAmount}
          className={`text-sm font-semibold ${row.remainingAmount > 0 ? "text-red-600" : "text-muted-foreground"}`}
        />
      ),
    },
    {
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    // Di per-customer view: tombol Bayar per baris masih ada
    ...(!isGlobal ? [{
      header: "",
      className: "w-[80px] text-right",
      render: (row: DebtRow) => (
        row.status !== "PAID" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setPayTarget({ id: row.customerId, name: row.customer.name })}
          >
            <Banknote className="h-3.5 w-3.5" />
            Bayar
          </Button>
        ) : null
      ),
    }] : []),
  ]

  return (
    <div className="space-y-4">
      {/* Filter bar — hanya di global view */}
      {isGlobal && (
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={filters.search}
            onChange={(v) => onFilterChange("search", v)}
            placeholder="Cari nama customer..."
            className="w-56"
          />
          <Select
            value={filters.status || "active"}
            onValueChange={(v) => onFilterChange("status", v === "active" ? "" : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Belum Lunas</SelectItem>
              <SelectItem value="UNPAID">Belum Bayar</SelectItem>
              <SelectItem value="PARTIAL">Sebagian</SelectItem>
              <SelectItem value="PAID">Lunas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Global view: 2 tabs */}
      {isGlobal ? (
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Ringkasan per Customer</TabsTrigger>
            <TabsTrigger value="all">Semua Hutang</TabsTrigger>
          </TabsList>

          {/* Tab 1: Ringkasan per Customer */}
          <TabsContent value="summary" className="mt-4">
            <div className="space-y-4">
              <SearchInput
                value={summarySearch}
                onChange={(v) => { setSummarySearch(v); setSummaryPage(1) }}
                placeholder="Cari nama customer..."
                className="w-56"
              />
              {isSummaryLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : summaryData.length === 0 ? (
                <div className="rounded-lg border bg-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">Tidak ada hutang aktif</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <div className="divide-y">
                    {summaryData.map((c) => (
                      <div key={c.customerId} className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="min-w-0">
                          <Link href={`/debts/${c.customerId}`} className="font-medium text-sm hover:underline flex items-center gap-1.5">
                            {c.name}
                            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          </Link>
                          {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                          <p className="text-xs text-muted-foreground">{c.debtCount} transaksi belum lunas</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total Hutang</p>
                            <CurrencyDisplay amount={c.totalRemaining} className="text-sm font-bold text-red-600" />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 h-8"
                            onClick={() => setPayTarget({ id: c.customerId, name: c.name })}
                          >
                            <Banknote className="h-3.5 w-3.5" />
                            Bayar Hutang
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Pagination meta={summaryMeta} onPageChange={setSummaryPage} />
            </div>
          </TabsContent>

          {/* Tab 2: Semua Hutang per transaksi */}
          <TabsContent value="all" className="mt-4">
            <div className="space-y-4">
              {/* Filter status di dalam tab */}
              <Select
                value={filters.status || "active"}
                onValueChange={(v) => onFilterChange("status", v === "active" ? "" : v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Belum Lunas</SelectItem>
                  <SelectItem value="UNPAID">Belum Bayar</SelectItem>
                  <SelectItem value="PARTIAL">Sebagian</SelectItem>
                  <SelectItem value="PAID">Lunas</SelectItem>
                </SelectContent>
              </Select>
              <DataTable
                columns={columns}
                data={data}
                isLoading={isLoading}
                emptyMessage="Tidak ada hutang"
                emptyDescription="Hutang akan muncul saat ada transaksi yang belum lunas"
                keyExtractor={(row) => row.id}
              />
              <Pagination meta={meta} onPageChange={onPageChange} />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        /* Per-customer view: tidak pakai tabs, langsung tabel */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={filters.status || "active"}
              onValueChange={(v) => onFilterChange("status", v === "active" ? "" : v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Belum Lunas</SelectItem>
                <SelectItem value="UNPAID">Belum Bayar</SelectItem>
                <SelectItem value="PARTIAL">Sebagian</SelectItem>
                <SelectItem value="PAID">Lunas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            emptyMessage="Tidak ada hutang"
            emptyDescription="Hutang akan muncul saat ada transaksi yang belum lunas"
            keyExtractor={(row) => row.id}
          />
          <Pagination meta={meta} onPageChange={onPageChange} />
        </div>
      )}

      {payTarget && (
        <DebtPaymentForm
          open={!!payTarget}
          onOpenChange={(open) => !open && setPayTarget(null)}
          customerId={payTarget.id}
          customerName={payTarget.name}
          onSuccess={() => {
            setPayTarget(null)
            onRefetch()
            fetchSummary()
          }}
        />
      )}
    </div>
  )
}
