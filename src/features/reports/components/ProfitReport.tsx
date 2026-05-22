"use client"

import { useState, useCallback } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { ReportFilters } from "./ReportFilters"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { FileDown, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { usePdfExport, fetchImageAsBase64 } from "@/lib/pdf/usePdfExport"
import { ProfitReportPdf } from "../pdf/ProfitReportPdf"
import { useSettingsStore } from "@/stores/settings.store"
import type { ProfitReport as ProfitReportType, ProfitDataPoint } from "../types/report.types"

function formatRevenue(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
  return String(v)
}

export function ProfitReport() {
  const [data, setData] = useState<ProfitReportType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<any>(null)
  const { exportPdf, isGenerating } = usePdfExport()
  const { store, reload } = useSettingsStore()

  const fetchData = useCallback(async (filters: any) => {
    setIsLoading(true)
    setCurrentFilters(filters)
    try {
      const params = new URLSearchParams()
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom.toISOString())
      if (filters.dateTo) params.set("dateTo", filters.dateTo.toISOString())
      const res = await fetch(`/api/reports/profit?${params}`)
      const json = await res.json()
      setData(json.data)
    } catch {} finally { setIsLoading(false) }
  }, [])

  async function handleExportPdf() {
    if (!data) return
    await reload()
    const dateFrom = currentFilters?.dateFrom ?? new Date(Date.now() - 30 * 86400000)
    const dateTo = currentFilters?.dateTo ?? new Date()
    const filename = `laporan-profit-${format(dateFrom, "yyyyMMdd")}-${format(dateTo, "yyyyMMdd")}.pdf`
    const logoBase64 = store.logoUrl ? await fetchImageAsBase64(store.logoUrl) : null
    await exportPdf(
      <ProfitReportPdf
        data={data}
        storeName={store.storeName || "FJP Shop"}
        storeAddress={store.storeAddress}
        storePhone={store.storePhone}
        logoUrl={logoBase64 || undefined}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />,
      filename
    )
  }

  const columns: Column<ProfitDataPoint>[] = [
    {
      header: "Tanggal",
      render: (row) => {
        try { return <span className="text-sm">{format(new Date(row.date), "dd MMM yyyy", { locale: idLocale })}</span> }
        catch { return <span className="text-sm font-mono">{row.date}</span> }
      },
    },
    { header: "Revenue", render: (row) => <CurrencyDisplay amount={row.revenue} className="text-sm" /> },
    { header: "Kas Masuk", render: (row) => <CurrencyDisplay amount={row.cashRevenue} className="text-sm text-green-600" /> },
    { header: "HPP", render: (row) => <CurrencyDisplay amount={row.hpp} className="text-sm text-muted-foreground" /> },
    {
      header: "Profit (Accrual)",
      render: (row) => <CurrencyDisplay amount={row.profit} className={`text-sm font-semibold ${row.profit >= 0 ? "text-green-600" : "text-red-600"}`} />,
    },
    {
      header: "Profit (Cash)",
      render: (row) => <CurrencyDisplay amount={row.cashProfit} className={`text-sm font-semibold ${row.cashProfit >= 0 ? "text-blue-600" : "text-red-600"}`} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <ReportFilters onFilter={fetchData} />
        </div>
        {data && (
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={isGenerating} className="gap-2 shrink-0 self-start">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Export PDF
          </Button>
        )}
      </div>

      {data && (
        <div className="space-y-3">
          {/* Accrual */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Profit Accrual (berdasarkan nilai penjualan)
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Revenue", value: data.totalRevenue, className: "" },
                { label: "Total HPP", value: data.totalHPP, className: "text-muted-foreground" },
                { label: "Gross Profit", value: data.totalProfit, className: data.totalProfit >= 0 ? "text-green-600" : "text-red-600" },
                { label: "Margin", value: null, extra: `${data.profitMargin.toFixed(1)}%`, className: data.profitMargin >= 0 ? "text-green-600" : "text-red-600" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border bg-card p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
                  {item.value !== null
                    ? <CurrencyDisplay amount={item.value} className={`text-xl font-bold ${item.className}`} />
                    : <p className={`text-xl font-bold ${item.className}`}>{item.extra}</p>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Cash Basis */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Profit Cash Basis (berdasarkan kas yang diterima)
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg border border-green-200 dark:border-green-900/50 bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Kas Masuk</p>
                <CurrencyDisplay amount={data.totalCashRevenue} className="text-xl font-bold text-green-600" />
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">HPP (proporsional)</p>
                <CurrencyDisplay amount={data.totalHPP * (data.totalRevenue > 0 ? data.totalCashRevenue / data.totalRevenue : 0)} className="text-xl font-bold text-muted-foreground" />
              </div>
              <div className="rounded-lg border border-blue-200 dark:border-blue-900/50 bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cash Profit</p>
                <CurrencyDisplay amount={data.totalCashProfit} className={`text-xl font-bold ${data.totalCashProfit >= 0 ? "text-blue-600" : "text-red-600"}`} />
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cash Margin</p>
                <p className={`text-xl font-bold ${data.cashProfitMargin >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  {data.cashProfitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? <Skeleton className="h-48 w-full" /> : data && data.data.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-3">Revenue vs HPP vs Profit per hari</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.data}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickFormatter={(v) => { try { return format(new Date(v), "dd/MM") } catch { return v } }} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatRevenue} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip formatter={(v: any, name: any) => {
                const labels: Record<string, string> = { revenue: "Revenue", cashRevenue: "Kas Masuk", hpp: "HPP", profit: "Profit" }
                return [`Rp ${Number(v).toLocaleString("id-ID")}`, labels[name] ?? name]
              }} />
              <Legend formatter={(v: string) => ({ revenue: "Revenue", cashRevenue: "Kas Masuk", hpp: "HPP", profit: "Profit" }[v] ?? v)} iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
              <Area type="monotone" dataKey="cashRevenue" stroke="#16a34a" strokeWidth={1.5} fill="none" strokeDasharray="4 2" />
              <Area type="monotone" dataKey="hpp" stroke="#f59e0b" strokeWidth={1.5} fill="none" strokeDasharray="4 2" />
              <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} fill="url(#profitGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {!isLoading && data && (
        <DataTable columns={columns} data={data.data} emptyMessage="Tidak ada data" keyExtractor={(r) => r.date} />
      )}
    </div>
  )
}
