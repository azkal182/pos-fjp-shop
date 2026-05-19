"use client"

import Link from "next/link"
import { Eye } from "lucide-react"
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
import { SearchInput } from "@/components/shared/SearchInput"
import { Pagination } from "@/components/shared/Pagination"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { PaginationMeta } from "@/types"

interface Transaction {
  id: string
  code: string
  totalAmount: number
  paidAmount: number
  paymentStatus: string
  paymentMethod: string
  transactionDate: string
  customer: { id: string; name: string } | null
}

interface TransactionTableProps {
  data: Transaction[]
  meta: PaginationMeta
  isLoading?: boolean
  filters: {
    search: string
    paymentStatus: string
    dateFrom?: Date
    dateTo?: Date
  }
  onFilterChange: (key: string, value: string) => void
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void
  onPageChange: (page: number) => void
}

export function TransactionTable({
  data, meta, isLoading, filters,
  onFilterChange, onDateRangeChange, onPageChange,
}: TransactionTableProps) {
  const columns: Column<Transaction>[] = [
    {
      header: "Kode",
      render: (row) => (
        <Link href={`/transactions/${row.id}`} className="font-mono text-xs hover:underline text-primary">
          {row.code}
        </Link>
      ),
    },
    {
      header: "Customer",
      render: (row) => (
        <span className="text-sm">{row.customer?.name ?? <span className="text-muted-foreground">Walk-in</span>}</span>
      ),
    },
    {
      header: "Tanggal",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.transactionDate), "dd MMM yyyy HH:mm", { locale: idLocale })}
        </span>
      ),
    },
    {
      header: "Total",
      render: (row) => <CurrencyDisplay amount={Number(row.totalAmount)} className="font-semibold" />,
    },
    {
      header: "Bayar",
      render: (row) => <CurrencyDisplay amount={Number(row.paidAmount)} className="text-sm" />,
    },
    {
      header: "Status",
      render: (row) => <StatusBadge status={row.paymentStatus} />,
    },
    {
      header: "Aksi",
      className: "w-[60px] text-right",
      render: (row) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href={`/transactions/${row.id}`}><Eye className="h-4 w-4" /></Link>
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={filters.search}
          onChange={(v) => onFilterChange("search", v)}
          placeholder="Cari kode atau customer..."
          className="w-56"
        />
        <Select
          value={filters.paymentStatus || "all"}
          onValueChange={(v) => onFilterChange("paymentStatus", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="PAID">Lunas</SelectItem>
            <SelectItem value="PARTIAL">Sebagian</SelectItem>
            <SelectItem value="UNPAID">Belum Bayar</SelectItem>
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
        emptyMessage="Belum ada transaksi"
        emptyDescription="Transaksi akan muncul setelah ada penjualan di POS"
        keyExtractor={(row) => row.id}
      />

      <Pagination meta={meta} onPageChange={onPageChange} />
    </div>
  )
}
