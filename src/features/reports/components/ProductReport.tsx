"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, Search } from "lucide-react"
import { differenceInCalendarDays, format, subDays } from "date-fns"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/useToast"
import type {
  PartyProductMatrixReport,
  PartyProductMatrixRow,
  ProductReportItem,
} from "../types/report.types"

type ProductReportMode = "global" | "customer" | "vendor"

interface Category { id: string; name: string }
interface Party { id: string; name: string }

function toDateParam(date?: Date): string | undefined {
  return date ? format(date, "yyyy-MM-dd") : undefined
}

function formatQty(value: number): string {
  return value === 0 ? "-" : value.toLocaleString("id-ID")
}

export function ProductReport() {
  const toast = useToast()
  const [mode, setMode] = useState<ProductReportMode>("global")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 29),
    to: new Date(),
  })
  const [categoryId, setCategoryId] = useState("")
  const [partyId, setPartyId] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [customers, setCustomers] = useState<Party[]>([])
  const [vendors, setVendors] = useState<Party[]>([])
  const [globalData, setGlobalData] = useState<ProductReportItem[]>([])
  const [matrixData, setMatrixData] = useState<PartyProductMatrixReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()).then((j) => setCategories(j.data ?? [])),
      fetch("/api/customers?isActive=true&limit=500").then((r) => r.json()).then((j) => setCustomers(j.data ?? [])),
      fetch("/api/vendors?isActive=true").then((r) => r.json()).then((j) => setVendors(j.data ?? [])),
    ]).catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      const dateFrom = toDateParam(dateRange.from)
      const dateTo = toDateParam(dateRange.to)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)

      if (mode === "global") {
        if (categoryId) params.set("categoryId", categoryId)
        const res = await fetch(`/api/reports/products?${params}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "Gagal memuat laporan produk")
        setGlobalData(json.data ?? [])
        setMatrixData(null)
        return
      }

      if (dateRange.from && dateRange.to) {
        const dayCount = differenceInCalendarDays(dateRange.to, dateRange.from) + 1
        if (dayCount < 1 || dayCount > 31) {
          throw new Error("Range tanggal untuk rekap customer/vendor maksimal 1 bulan")
        }
      }

      params.set("type", mode)
      if (partyId) params.set("partyId", partyId)
      const res = await fetch(`/api/reports/party-products?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat laporan rekap produk")
      setMatrixData(json.data ?? null)
      setGlobalData([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }, [categoryId, dateRange.from, dateRange.to, mode, partyId, toast])

  useEffect(() => {
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPartyId("")
  }, [mode])

  const exportUrl = useMemo(() => {
    if (mode === "global") return ""
    const params = new URLSearchParams()
    const dateFrom = toDateParam(dateRange.from)
    const dateTo = toDateParam(dateRange.to)
    params.set("type", mode)
    if (partyId) params.set("partyId", partyId)
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    return `/api/export/report/party-products?${params}`
  }, [dateRange.from, dateRange.to, mode, partyId])

  const globalColumns: Column<ProductReportItem & { rank: number }>[] = [
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

  const globalRows = globalData.map((item, i) => ({ ...item, rank: i + 1 }))
  const parties = mode === "customer" ? customers : vendors
  const matrixRangeDays = dateRange.from && dateRange.to
    ? differenceInCalendarDays(dateRange.to, dateRange.from) + 1
    : 0
  const isMatrixRangeValid = mode === "global" || (matrixRangeDays > 0 && matrixRangeDays <= 31)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
          <Select value={mode} onValueChange={(v) => setMode(v as ProductReportMode)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global</SelectItem>
              <SelectItem value="customer">By Customer</SelectItem>
              <SelectItem value="vendor">By Vendor</SelectItem>
            </SelectContent>
          </Select>

          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder="Pilih rentang tanggal"
            className="w-full sm:w-64"
          />

          {mode === "global" ? (
            <Select value={categoryId || "all"} onValueChange={(v) => setCategoryId(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={partyId || "all"} onValueChange={(v) => setPartyId(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder={mode === "customer" ? "Semua Customer" : "Semua Vendor"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{mode === "customer" ? "Semua Customer" : "Semua Vendor"}</SelectItem>
                {parties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button onClick={fetchData} size="sm" className="w-full sm:w-auto gap-1.5">
            <Search className="h-3.5 w-3.5" />
            Terapkan
          </Button>

          {mode !== "global" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto gap-1.5"
              onClick={() => window.open(exportUrl, "_blank")}
              disabled={!matrixData || isLoading || !isMatrixRangeValid}
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </Button>
          )}
        </div>
        {mode !== "global" && !isMatrixRangeValid && (
          <p className="text-xs text-destructive">Range tanggal untuk rekap customer/vendor maksimal 1 bulan.</p>
        )}
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : mode === "global" ? (
        <DataTable
          columns={globalColumns}
          data={globalRows}
          emptyMessage="Tidak ada data produk"
          keyExtractor={(r) => r.productId}
        />
      ) : (
        <ProductMatrixTable data={matrixData} />
      )}
    </div>
  )
}

function ProductMatrixTable({ data }: { data: PartyProductMatrixReport | null }) {
  if (!data || data.rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Tidak ada data rekap produk</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <p className="text-sm font-semibold">{data.partyName}</p>
        <p className="text-xs text-muted-foreground">{data.dateFrom} s/d {data.dateTo}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-3 py-2 text-left w-12" rowSpan={2}>No</th>
              <th className="px-3 py-2 text-left min-w-[220px]" rowSpan={2}>Nama Barang</th>
              <th className="px-3 py-2 text-center" colSpan={data.dates.length}>Jumlah Menurut Tanggal</th>
              <th className="px-3 py-2 text-right" rowSpan={2}>Total</th>
              <th className="px-3 py-2 text-right" rowSpan={2}>Stock</th>
              <th className="px-3 py-2 text-right" rowSpan={2}>Harga</th>
            </tr>
            <tr className="border-b">
              {data.dates.map((date) => (
                <th key={date} className="px-2 py-2 text-center min-w-10">{Number(date.slice(-2))}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, index) => (
              <ProductMatrixRow key={row.productId} row={row} dates={data.dates} index={index} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProductMatrixRow({
  row,
  dates,
  index,
}: {
  row: PartyProductMatrixRow
  dates: string[]
  index: number
}) {
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/20">
      <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
      <td className="px-3 py-2">
        <p className="font-medium">{row.productName}</p>
        <p className="text-xs text-muted-foreground font-mono">{row.productCode} · {row.unit}</p>
      </td>
      {dates.map((date) => (
        <td key={date} className="px-2 py-2 text-center tabular-nums">
          {formatQty(row.quantitiesByDate[date] ?? 0)}
        </td>
      ))}
      <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatQty(row.totalQty)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatQty(row.stock)}</td>
      <td className="px-3 py-2 text-right">
        <CurrencyDisplay amount={row.averagePrice} className="text-sm font-medium" />
      </td>
    </tr>
  )
}
