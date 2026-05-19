"use client"

import { useState, useCallback } from "react"
import { ReportFilters } from "./ReportFilters"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Skeleton } from "@/components/ui/skeleton"
import type { ProductReportItem } from "../types/report.types"

export function ProductReport() {
  const [data, setData] = useState<ProductReportItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = useCallback(async (filters: any) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom.toISOString())
      if (filters.dateTo) params.set("dateTo", filters.dateTo.toISOString())
      if (filters.categoryId) params.set("categoryId", filters.categoryId)
      const res = await fetch(`/api/reports/products?${params}`)
      const json = await res.json()
      setData(json.data ?? [])
    } catch {} finally { setIsLoading(false) }
  }, [])

  const columns: Column<ProductReportItem & { rank: number }>[] = [
    { header: "#", render: (row) => <span className="text-sm font-bold text-muted-foreground">{row.rank}</span> },
    {
      header: "Produk",
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.productName}</p>
          <p className="text-xs text-muted-foreground">{row.categoryName} · <span className="font-mono">{row.productCode}</span></p>
        </div>
      ),
    },
    { header: "Qty Terjual", render: (row) => <span className="text-sm font-semibold">{row.totalQty}</span> },
    { header: "Revenue", render: (row) => <CurrencyDisplay amount={row.totalRevenue} className="font-semibold" /> },
    { header: "Profit", render: (row) => <CurrencyDisplay amount={row.totalProfit} className="font-semibold text-green-600" /> },
  ]

  const dataWithRank = data.map((item, i) => ({ ...item, rank: i + 1 }))

  return (
    <div className="space-y-6">
      <ReportFilters onFilter={fetchData} showCategory />
      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <DataTable
          columns={columns}
          data={dataWithRank}
          emptyMessage="Tidak ada data produk"
          keyExtractor={(r) => r.productId}
        />
      )}
    </div>
  )
}
