"use client"

import { useState } from "react"
import { Eye, ImageIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import { Pagination } from "@/components/shared/Pagination"
import { ReceiptImageDialog } from "./ReceiptImageDialog"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { PaginationMeta } from "@/types"

interface Purchase {
  id: string
  code: string
  vendor: { id: string; name: string }
  totalAmount: number
  paidAmount: number
  debtAmount: number
  paymentStatus: string
  purchaseDate: string
  createdAt: string
  receiptImageUrl?: string | null
  _count: { items: number }
}

interface Vendor {
  id: string
  name: string
}

interface PurchaseTableProps {
  data: Purchase[]
  meta: PaginationMeta
  isLoading?: boolean
  vendors: Vendor[]
  filters: {
    vendorId: string
    dateFrom?: Date
    dateTo?: Date
  }
  onFilterChange: (key: string, value: string) => void
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void
  onPageChange: (page: number) => void
}

export function PurchaseTable({
  data,
  meta,
  isLoading,
  vendors,
  filters,
  onFilterChange,
  onDateRangeChange,
  onPageChange,
}: PurchaseTableProps) {
  const [receiptView, setReceiptView] = useState<{ url: string; code: string } | null>(null)

  const columns: Column<Purchase>[] = [
    {
      header: "Kode PO",
      render: (row) => (
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</span>
      ),
    },
    {
      header: "Vendor",
      render: (row) => <span className="font-medium">{row.vendor.name}</span>,
    },
    {
      header: "Tanggal",
      render: (row) => {
        const businessDate = new Date(row.purchaseDate)
        const eventTime = new Date(row.createdAt || row.purchaseDate)
        return (
          <span className="text-sm text-muted-foreground">
            {format(businessDate, "dd MMM yyyy", { locale: idLocale })} · {format(eventTime, "HH:mm", { locale: idLocale })}
          </span>
        )
      },
    },
    {
      header: "Jumlah Item",
      render: (row) => (
        <span className="text-sm">{row._count.items} item</span>
      ),
    },
    {
      header: "Total",
      render: (row) => <CurrencyDisplay amount={Number(row.totalAmount)} className="font-semibold" />,
    },
    {
      header: "Status Pembayaran",
      render: (row) => {
        const paid = Number(row.paidAmount)
        const debt = Number(row.debtAmount)
        const isPartial = row.paymentStatus === "PARTIAL"
        return (
          <div className="space-y-0.5">
            <StatusBadge status={row.paymentStatus} />
            {isPartial && (
              <p className="text-[11px] text-muted-foreground">
                Terbayar Rp {paid.toLocaleString("id-ID")} · Sisa Rp {debt.toLocaleString("id-ID")}
              </p>
            )}
          </div>
        )
      },
    },
    {
      header: "Aksi",
      className: "w-[100px] text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.receiptImageUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              title="Lihat nota"
              onClick={() => setReceiptView({ url: row.receiptImageUrl!, code: row.code })}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={`/purchases/${row.id}`} aria-label="Detail pembelian">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.vendorId || "all"}
          onValueChange={(v) => onFilterChange("vendorId", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua Vendor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Vendor</SelectItem>
            {vendors.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangePicker
          value={{ from: filters.dateFrom, to: filters.dateTo }}
          onChange={onDateRangeChange}
          placeholder="Filter tanggal..."
          className="w-64"
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="Belum ada pembelian"
        emptyDescription="Catat pembelian barang untuk memperbarui stok"
        keyExtractor={(row) => row.id}
      />

      <Pagination meta={meta} onPageChange={onPageChange} />

      {receiptView && (
        <ReceiptImageDialog
          open={!!receiptView}
          onOpenChange={(open) => !open && setReceiptView(null)}
          imageUrl={receiptView.url}
          purchaseCode={receiptView.code}
        />
      )}
    </div>
  )
}
