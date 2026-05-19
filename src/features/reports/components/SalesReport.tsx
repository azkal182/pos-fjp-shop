"use client"

import { useState, useCallback } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ReportFilters } from "./ReportFilters"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { SalesReport as SalesReportType, SalesDataPoint } from "../types/report.types"

function formatRevenue(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
  return String(v)
}

export function SalesReport() {
  const [data, setData] = useState<SalesReportType | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = useCallback(async (filters: any) => {
    setIsLoading(true)
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

  const columns: Column<SalesDataPoint>[] = [
    {
      header: "Tanggal",
      render: (row) => {
        try { return <span className="text-sm">{format(new Date(row.date), "dd MMM yyyy", { locale: idLocale })}</span> }
        catch { return <span className="text-sm font-mono">{row.date}</span> }
      },
    },
    { header: "Transaksi", render: (row) => <span className="text-sm">{row.transactionCount}</span> },
    { header: "Revenue", render: (row) => <CurrencyDisplay amount={row.totalRevenue} className="font-semibold" /> },
  ]

  return (
    <div className="space-y-6">
      <ReportFilters onFilter={fetchData} showGroupBy />

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Revenue", value: <CurrencyDisplay amount={data.totalRevenue} className="text-xl font-bold" /> },
            { label: "Total Transaksi", value: <p className="text-xl font-bold">{data.totalTransactions}</p> },
            { label: "Rata-rata / Transaksi", value: <CurrencyDisplay amount={data.totalTransactions > 0 ? data.totalRevenue / data.totalTransactions : 0} className="text-xl font-bold" /> },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
              {item.value}
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {isLoading ? <Skeleton className="h-48 w-full" /> : data && data.data.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickFormatter={(v) => { try { return format(new Date(v), "dd/MM") } catch { return v } }} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatRevenue} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip formatter={(v: any) => [`Rp ${Number(v).toLocaleString("id-ID")}`, "Revenue"]} />
              <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
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
