"use client"

import { useState } from "react"
import Link from "next/link"
import { Banknote, BookOpen } from "lucide-react"
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
import { SearchInput } from "@/components/shared/SearchInput"
import { Pagination } from "@/components/shared/Pagination"
import { DebtAgingBadge } from "./DebtAgingBadge"
import { DebtPaymentForm } from "./DebtPaymentForm"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { PaginationMeta } from "@/types"
import type { AgingResult } from "../services/debt-aging.service"

interface DebtRow {
  id: string
  customerId: string
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  status: string
  debtDate: Date | string
  aging: AgingResult | null
  customer: { id: string; name: string; phone: string | null }
  transaction: { code: string }
}

interface DebtTableProps {
  data: DebtRow[]
  meta: PaginationMeta
  isLoading?: boolean
  isGlobal?: boolean
  filters: {
    search: string
    status: string
  }
  onFilterChange: (key: string, value: string) => void
  onPageChange: (page: number) => void
  onRefetch: () => void
}

export function DebtTable({
  data, meta, isLoading, isGlobal = true,
  filters, onFilterChange, onPageChange, onRefetch,
}: DebtTableProps) {
  const [payTarget, setPayTarget] = useState<{ id: string; name: string } | null>(null)

  // Di global view: group by customer untuk tombol Bayar per customer
  const customerMap = new Map<string, { id: string; name: string; phone: string | null; totalRemaining: number }>()
  if (isGlobal) {
    for (const row of data) {
      const existing = customerMap.get(row.customerId)
      if (existing) {
        existing.totalRemaining += row.remainingAmount
      } else {
        customerMap.set(row.customerId, {
          id: row.customerId,
          name: row.customer.name,
          phone: row.customer.phone,
          totalRemaining: row.remainingAmount,
        })
      }
    }
  }

  const columns: Column<DebtRow>[] = [
    ...(isGlobal ? [{
      header: "Customer",
      render: (row: DebtRow) => (
        <div>
          <Link href={`/debts/${row.customer.id}`} className="font-medium text-sm hover:underline">
            {row.customer.name}
          </Link>
          {row.customer.phone && (
            <p className="text-xs text-muted-foreground">{row.customer.phone}</p>
          )}
        </div>
      ),
    }] : []),
    {
      header: "Transaksi",
      render: (row) => (
        <Link href={`/transactions/${row.id}`} className="font-mono text-xs hover:underline text-primary">
          {row.transaction.code}
        </Link>
      ),
    },
    {
      header: "Tanggal",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.debtDate), "dd MMM yyyy", { locale: idLocale })}
        </span>
      ),
    },
    {
      header: "Aging",
      render: (row) => <DebtAgingBadge debtDate={new Date(row.debtDate)} />,
    },
    {
      header: "Original",
      render: (row) => <CurrencyDisplay amount={row.originalAmount} className="text-sm" />,
    },
    {
      header: "Terbayar",
      render: (row) => <CurrencyDisplay amount={row.paidAmount} className="text-sm text-green-600" />,
    },
    {
      header: "Sisa",
      render: (row) => (
        <CurrencyDisplay
          amount={row.remainingAmount}
          className={`text-sm font-semibold ${row.remainingAmount > 0 ? "text-red-600" : "text-muted-foreground"}`}
        />
      ),
    },
    {
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    // Di per-customer view: tombol Bayar per baris masih ada
    ...(!isGlobal ? [{
      header: "",
      className: "w-[80px] text-right",
      render: (row: DebtRow) => (
        row.status !== "PAID" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setPayTarget({ id: row.customerId, name: row.customer.name })}
          >
            <Banknote className="h-3.5 w-3.5" />
            Bayar
          </Button>
        ) : null
      ),
    }] : []),
  ]

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {isGlobal && (
          <SearchInput
            value={filters.search}
            onChange={(v) => onFilterChange("search", v)}
            placeholder="Cari nama customer..."
            className="w-56"
          />
        )}
        <Select
          value={filters.status || "active"}
          onValueChange={(v) => onFilterChange("status", v === "active" ? "" : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Belum Lunas</SelectItem>
            <SelectItem value="UNPAID">Belum Bayar</SelectItem>
            <SelectItem value="PARTIAL">Sebagian</SelectItem>
            <SelectItem value="PAID">Lunas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Di global view: tampilkan ringkasan per customer dengan tombol Bayar */}
      {isGlobal && customerMap.size > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Ringkasan per Customer
          </div>
          <div className="divide-y">
            {Array.from(customerMap.values()).map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <Link href={`/debts/${c.id}`} className="font-medium text-sm hover:underline flex items-center gap-1.5">
                    {c.name}
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                  {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total Hutang</p>
                    <CurrencyDisplay amount={c.totalRemaining} className="text-sm font-bold text-red-600" />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8"
                    onClick={() => setPayTarget({ id: c.id, name: c.name })}
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    Bayar Hutang
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabel detail per transaksi */}
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="Tidak ada hutang"
        emptyDescription="Hutang akan muncul saat ada transaksi yang belum lunas"
        keyExtractor={(row) => row.id}
      />

      <Pagination meta={meta} onPageChange={onPageChange} />

      {payTarget && (
        <DebtPaymentForm
          open={!!payTarget}
          onOpenChange={(open) => !open && setPayTarget(null)}
          customerId={payTarget.id}
          customerName={payTarget.name}
          onSuccess={() => {
            setPayTarget(null)
            onRefetch()
          }}
        />
      )}
    </div>
  )
}
