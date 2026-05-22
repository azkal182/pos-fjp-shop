"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { SearchInput } from "@/components/shared/SearchInput"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { Pagination } from "@/components/shared/Pagination"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { PaginationMeta } from "@/types"

interface StockMovement {
  id: string
  type: string
  quantity: number
  stockBefore: number
  stockAfter: number
  referenceCode: string | null
  createdAt: string
  product: { id: string; name: string; code: string; unit: string }
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  PURCHASE_IN:    { label: "Barang Masuk",        color: "bg-green-100 text-green-800 border-green-200" },
  SALE_OUT:       { label: "Penjualan",            color: "bg-red-100 text-red-800 border-red-200" },
  ADJUSTMENT_IN:  { label: "Penyesuaian Masuk",   color: "bg-blue-100 text-blue-800 border-blue-200" },
  ADJUSTMENT_OUT: { label: "Penyesuaian Keluar",  color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
}

interface StockMovementTableProps {
  data: StockMovement[]
  meta: PaginationMeta
  isLoading?: boolean
  filters: {
    search: string
    type: string
    dateFrom?: Date
    dateTo?: Date
  }
  onFilterChange: (key: string, value: string) => void
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void
  onPageChange: (page: number) => void
}

export function StockMovementTable({
  data,
  meta,
  isLoading,
  filters,
  onFilterChange,
  onDateRangeChange,
  onPageChange,
}: StockMovementTableProps) {
  const columns: Column<StockMovement>[] = [
    {
      header: "Produk",
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.product.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.product.code}</p>
        </div>
      ),
    },
    {
      header: "Tipe",
      render: (row) => {
        const info = TYPE_LABELS[row.type] ?? { label: row.type, color: "bg-gray-100 text-gray-700 border-gray-200" }
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${info.color}`}>
            {info.label}
          </span>
        )
      },
    },
    {
      header: "Qty",
      render: (row) => (
        <span className={`font-semibold text-sm ${row.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
          {row.quantity > 0 ? `+${row.quantity}` : row.quantity} {row.product.unit}
        </span>
      ),
    },
    {
      header: "Stok",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.stockBefore} → <span className="font-medium text-foreground">{row.stockAfter}</span>
        </span>
      ),
    },
    {
      header: "Referensi",
      render: (row) => (
        <span className="font-mono text-xs">{row.referenceCode ?? "—"}</span>
      ),
    },
    {
      header: "Tanggal",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.createdAt), "dd MMM yyyy HH:mm", { locale: idLocale })}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        <SearchInput
          value={filters.search}
          onChange={(v) => onFilterChange("search", v)}
          placeholder="Cari nama produk..."
          className="w-full sm:w-56"
        />
        <Select
          value={filters.type || "all"}
          onValueChange={(v) => onFilterChange("type", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua Tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="PURCHASE_IN">Barang Masuk</SelectItem>
            <SelectItem value="SALE_OUT">Penjualan</SelectItem>
            <SelectItem value="ADJUSTMENT_IN">Penyesuaian Masuk</SelectItem>
            <SelectItem value="ADJUSTMENT_OUT">Penyesuaian Keluar</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePicker
          value={{ from: filters.dateFrom, to: filters.dateTo }}
          onChange={onDateRangeChange}
          placeholder="Filter tanggal..."
          className="w-full sm:w-64"
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="Belum ada pergerakan stok"
        emptyDescription="Pergerakan stok akan tercatat otomatis saat ada pembelian atau penjualan"
        keyExtractor={(row) => row.id}
      />

      <Pagination meta={meta} onPageChange={onPageChange} />
    </div>
  )
}
