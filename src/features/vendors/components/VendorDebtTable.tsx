"use client"

import { useState } from "react"
import { Banknote } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Pagination } from "@/components/shared/Pagination"
import { VendorPaymentForm } from "./VendorPaymentForm"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { PaginationMeta } from "@/types"

interface VendorDebt {
  id: string
  vendorId: string
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  status: string
  debtDate: string
  vendor: { id: string; name: string; phone: string | null }
  purchase: { code: string }
}

interface VendorDebtTableProps {
  data: VendorDebt[]
  meta: PaginationMeta
  isLoading?: boolean
  isGlobal?: boolean
  filters: { status: string }
  onFilterChange: (key: string, value: string) => void
  onPageChange: (page: number) => void
  onRefetch: () => void
}

export function VendorDebtTable({
  data, meta, isLoading, isGlobal = true,
  filters, onFilterChange, onPageChange, onRefetch,
}: VendorDebtTableProps) {
  const [payTarget, setPayTarget] = useState<{ vendorId: string; vendorName: string; debtId?: string; maxAmount?: number; mode: "fifo" | "invoice" } | null>(null)

  // Group by vendor for global view
  const vendorMap = new Map<string, { id: string; name: string; phone: string | null; totalRemaining: number }>()
  if (isGlobal) {
    for (const row of data) {
      const existing = vendorMap.get(row.vendorId)
      if (existing) {
        existing.totalRemaining += Number(row.remainingAmount)
      } else {
        vendorMap.set(row.vendorId, {
          id: row.vendorId,
          name: row.vendor.name,
          phone: row.vendor.phone,
          totalRemaining: Number(row.remainingAmount),
        })
      }
    }
  }

  const columns: Column<VendorDebt>[] = [
    ...(isGlobal ? [{
      header: "Vendor",
      render: (row: VendorDebt) => (
        <div>
          <p className="font-medium text-sm">{row.vendor.name}</p>
          {row.vendor.phone && <p className="text-xs text-muted-foreground">{row.vendor.phone}</p>}
        </div>
      ),
    }] : []),
    {
      header: "Kode PO",
      render: (row) => <span className="font-mono text-xs">{row.purchase.code}</span>,
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
      header: "Original",
      render: (row) => <CurrencyDisplay amount={Number(row.originalAmount)} className="text-sm" />,
    },
    {
      header: "Terbayar",
      render: (row) => <CurrencyDisplay amount={Number(row.paidAmount)} className="text-sm text-green-600" />,
    },
    {
      header: "Sisa",
      render: (row) => (
        <CurrencyDisplay
          amount={Number(row.remainingAmount)}
          className={`text-sm font-semibold ${Number(row.remainingAmount) > 0 ? "text-red-600" : "text-muted-foreground"}`}
        />
      ),
    },
    { header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      header: "",
      className: "w-[90px] text-right",
      render: (row) => (
        row.status !== "PAID" ? (
          <Button
            variant="outline" size="sm" className="h-7 text-xs gap-1"
            onClick={() => setPayTarget({
              vendorId: row.vendorId,
              vendorName: row.vendor.name,
              debtId: row.id,
              maxAmount: Number(row.remainingAmount),
              mode: "invoice",
            })}
          >
            <Banknote className="h-3.5 w-3.5" />
            Bayar
          </Button>
        ) : null
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
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

      {/* Global: ringkasan per vendor */}
      {isGlobal && vendorMap.size > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Ringkasan per Vendor
          </div>
          <div className="divide-y">
            {Array.from(vendorMap.values()).map((v) => (
              <div key={v.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{v.name}</p>
                  {v.phone && <p className="text-xs text-muted-foreground">{v.phone}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total Hutang</p>
                    <CurrencyDisplay amount={v.totalRemaining} className="text-sm font-bold text-red-600" />
                  </div>
                  <Button
                    size="sm" variant="outline" className="gap-1.5 h-8"
                    onClick={() => setPayTarget({ vendorId: v.id, vendorName: v.name, mode: "fifo" })}
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    Bayar (FIFO)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="Tidak ada hutang ke vendor"
        emptyDescription="Hutang akan muncul saat ada PO yang belum lunas"
        keyExtractor={(row) => row.id}
      />

      <Pagination meta={meta} onPageChange={onPageChange} />

      {payTarget && (
        <VendorPaymentForm
          open={!!payTarget}
          onOpenChange={(open) => !open && setPayTarget(null)}
          vendorId={payTarget.vendorId}
          vendorName={payTarget.vendorName}
          mode={payTarget.mode}
          vendorDebtId={payTarget.debtId}
          maxAmount={payTarget.maxAmount}
          onSuccess={() => { setPayTarget(null); onRefetch() }}
        />
      )}
    </div>
  )
}
