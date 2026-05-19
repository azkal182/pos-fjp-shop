"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { Skeleton } from "@/components/ui/skeleton"
import type { DebtReport as DebtReportType } from "../types/report.types"

export function DebtReport() {
  const [data, setData] = useState<DebtReportType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/reports/debts")
      .then((r) => r.json())
      .then((json) => setData(json.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <Skeleton className="h-64 w-full" />

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Outstanding</p>
          <CurrencyDisplay amount={data.totalOutstanding} className="text-xl font-bold text-red-600" />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Customer Berpiutang</p>
          <p className="text-xl font-bold">{data.totalCustomersWithDebt}</p>
        </div>
      </div>

      {/* Chart */}
      {data.buckets.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-semibold mb-4">Breakdown per Aging</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.buckets} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}rb`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="categoryName" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={80} />
              <Tooltip formatter={(v: any) => [`Rp ${Number(v).toLocaleString("id-ID")}`, "Outstanding"]} />
              <Bar dataKey="totalOutstanding" radius={[0, 3, 3, 0]}>
                {data.buckets.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_120px] gap-2 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Kategori</span>
          <span className="text-center">Jumlah</span>
          <span className="text-right">Outstanding</span>
        </div>
        {data.buckets.map((bucket) => (
          <div key={bucket.categoryName} className="grid grid-cols-[1fr_80px_120px] gap-2 px-4 py-3 border-t items-center">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: bucket.color }} />
              <span className="text-sm font-medium">{bucket.categoryName}</span>
            </div>
            <span className="text-sm text-center">{bucket.count}</span>
            <div className="text-right">
              <CurrencyDisplay amount={bucket.totalOutstanding} className="text-sm font-semibold" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
