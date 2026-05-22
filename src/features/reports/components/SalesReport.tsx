"use client"

import { useState, useCallback } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { ReportFilters } from "./ReportFilters"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { FileDown, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { usePdfExport, fetchImageAsBase64 } from "@/lib/pdf/usePdfExport"
import { SalesReportPdf } from "../pdf/SalesReportPdf"
import { useSettingsStore } from "@/stores/settings.store"
import type { SalesReport as SalesReportType, SalesDataPoint } from "../types/report.types"

function formatRevenue(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
  return String(v)
}

export function SalesReport() {
  const [data, setData] = useState<SalesReportType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<any>(null)
  const { exportPdf, isGenerating } = usePdfExport()
  const { reload } = useSettingsStore()

  const fetchData = useCallback(async (filters: any) => {
    setIsLoading(true)
    setCurrentFilters(filters)
    try {
      const params = new URLSearchParams()
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom.toISOString())
      if (filters.dateTo) params.set("dateTo", filters.dateTo.toISOString())
      if (filters.groupBy) params.set("groupBy", filters.groupBy)
      const res = await fetch(`/api/reports/sales?${params}`)
      const json = await res.json()
      setData(json.data)
    } catch {} finally { setIsLoading(false) }
  }, [])

  async function handleExportPdf() {
    if (!data) return
    await reload()
    const freshStore = useSettingsStore.getState().store
    const dateFrom = currentFilters?.dateFrom ?? new Date(Date.now() - 30 * 86400000)
    const dateTo = currentFilters?.dateTo ?? new Date()
    const filename = `laporan-penjualan-${format(dateFrom, "yyyyMMdd")}-${format(dateTo, "yyyyMMdd")}.pdf`
    const logoBase64 = freshStore.logoUrl ? await fetchImageAsBase64(freshStore.logoUrl) : null
    await exportPdf(
      <SalesReportPdf
        data={data}
        storeName={freshStore.storeName || "FJP Shop"}
        storeAddress={freshStore.storeAddress}
        storePhone={freshStore.storePhone}
        logoUrl={logoBase64 || undefined}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />,
      filename
    )
  }

  const columns: Column<SalesDataPoint>[] = [
    {
      header: "Tanggal",
      render: (row) => {
        try { return <span className="text-sm">{format(new Date(row.date), "dd MMM yyyy", { locale: idLocale })}</span> }
        catch { return <span className="text-sm font-mono">{row.date}</span> }
      },
    },
    { header: "Transaksi", render: (row) => <span className="text-sm">{row.transactionCount}</span> },
    {
      header: "Nilai Penjualan",
      render: (row) => <CurrencyDisplay amount={row.totalRevenue} className="font-semibold" />,
    },
    {
      header: "Kas Masuk",
      render: (row) => <CurrencyDisplay amount={row.cashCollected} className="font-semibold text-green-600" />,
    },
    {
      header: "Piutang Baru",
      render: (row) => row.newDebt > 0
        ? <CurrencyDisplay amount={row.newDebt} className="text-sm text-orange-600" />
        : <span className="text-xs text-muted-foreground">—</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <ReportFilters onFilter={fetchData} showGroupBy />
        </div>
        {data && (
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isGenerating} className="gap-2 shrink-0 self-start">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Export PDF
          </Button>
        )}
      </div>

      {/* Summary — dual: accrual + cash */}
      {data && (
        <div className="space-y-3">
          {/* Accrual */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Nilai Penjualan (Accrual)
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Total Nilai Penjualan", value: data.totalRevenue },
                { label: "Total Transaksi", value: data.totalTransactions, isCount: true },
                { label: "Rata-rata / Transaksi", value: data.totalTransactions > 0 ? data.totalRevenue / data.totalTransactions : 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border bg-card p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
                  {item.isCount
                    ? <p className="text-xl font-bold">{item.value}</p>
                    : <CurrencyDisplay amount={item.value} className="text-xl font-bold" />
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Cash Basis */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Kas Masuk (Cash Basis)
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="rounded-lg border border-green-200 dark:border-green-900/50 bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Kas Masuk</p>
                <CurrencyDisplay amount={data.totalCashCollected} className="text-xl font-bold text-green-600" />
                <p className="text-xs text-muted-foreground mt-0.5">Tunai + bayar hutang</p>
              </div>
              <div className="rounded-lg border border-orange-200 dark:border-orange-900/50 bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Piutang Baru</p>
                <CurrencyDisplay amount={data.totalNewDebt} className="text-xl font-bold text-orange-600" />
                <p className="text-xs text-muted-foreground mt-0.5">Belum dibayar</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bayar Hutang Lama</p>
                <CurrencyDisplay amount={data.totalDebtPaymentsReceived} className="text-xl font-bold" />
                <p className="text-xs text-muted-foreground mt-0.5">Dari cicilan customer</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart — dual bar */}
      {isLoading ? <Skeleton className="h-48 w-full" /> : data && data.data.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-3">Nilai Penjualan vs Kas Masuk per periode</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.data} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickFormatter={(v) => { try { return format(new Date(v), "dd/MM") } catch { return v } }} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatRevenue} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip formatter={(v: any, name: any) => [`Rp ${Number(v).toLocaleString("id-ID")}`, name === "totalRevenue" ? "Nilai Penjualan" : "Kas Masuk"]} />
              <Legend formatter={(v) => v === "totalRevenue" ? "Nilai Penjualan" : "Kas Masuk"} iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="cashCollected" fill="#16a34a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      {!isLoading && data && (
        <DataTable columns={columns} data={data.data} emptyMessage="Tidak ada data" keyExtractor={(r) => r.date} />
      )}
    </div>
  )
}
