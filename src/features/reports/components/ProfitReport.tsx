"use client"

import { useState, useCallback } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { ReportFilters } from "./ReportFilters"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { ProfitReport as ProfitReportType } from "../types/report.types"

function formatRevenue(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
  return String(v)
}

export function ProfitReport() {
  const [data, setData] = useState<ProfitReportType | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = useCallback(async (filters: any) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom.toISOString())
      if (filters.dateTo) params.set("dateTo", filters.dateTo.toISOString())
      const res = await fetch(`/api/reports/profit?${params}`)
      const json = await res.json()
      setData(json.data)
    } catch {} finally { setIsLoading(false) }
  }, [])

  const columns: Column<{ date: string; revenue: number; hpp: number; profit: number }>[] = [
    {
      header: "Tanggal",
      render: (row) => {
        try { return <span className="text-sm">{format(new Date(row.date), "dd MMM yyyy", { locale: idLocale })}</span> }
        catch { return <span className="text-sm font-mono">{row.date}</span> }
      },
    },
    { header: "Revenue", render: (row) => <CurrencyDisplay amount={row.revenue} className="text-sm" /> },
    { header: "HPP", render: (row) => <CurrencyDisplay amount={row.hpp} className="text-sm text-muted-foreground" /> },
    { header: "Profit", render: (row) => <CurrencyDisplay amount={row.profit} className={`text-sm font-semibold ${row.profit >= 0 ? "text-green-600" : "text-red-600"}`} /> },
  ]

  return (
    <div className="space-y-6">
      <ReportFilters onFilter={fetchData} />

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue", value: data.totalRevenue, className: "" },
            { label: "Total HPP", value: data.totalHPP, className: "text-muted-foreground" },
            { label: "Total Profit", value: data.totalProfit, className: data.totalProfit >= 0 ? "text-green-600" : "text-red-600" },
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
      )}

      {isLoading ? <Skeleton className="h-48 w-full" /> : data && data.data.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
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
              <Tooltip formatter={(v: any, name: any) => [`Rp ${Number(v).toLocaleString("id-ID")}`, name === "revenue" ? "Revenue" : name === "hpp" ? "HPP" : "Profit"]} />
              <Legend formatter={(v) => v === "revenue" ? "Revenue" : v === "hpp" ? "HPP" : "Profit"} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
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
