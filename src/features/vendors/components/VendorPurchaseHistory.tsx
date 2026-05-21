"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Eye, Banknote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Pagination } from "@/components/shared/Pagination"
import { VendorPaymentForm } from "./VendorPaymentForm"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { PaginationMeta } from "@/types"

interface Purchase {
  id: string
  code: string
  totalAmount: number
  paidAmount: number
  debtAmount: number
  changeAmount: number
  paymentStatus: string
  paymentMethod: string
  purchaseDate: string
  _count: { items: number }
  vendorDebt: {
    id: string
    remainingAmount: number
    status: string
  } | null
}

interface VendorPurchaseHistoryProps {
  vendorId: string
  vendorName?: string
  onPaymentSuccess?: () => void
}

export function VendorPurchaseHistory({ vendorId, vendorName = "Vendor", onPaymentSuccess }: VendorPurchaseHistoryProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [payTarget, setPayTarget] = useState<{ debtId: string; maxAmount: number } | null>(null)

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("vendorId", vendorId)
      params.set("page", String(page))
      params.set("limit", "20")
      const res = await fetch(`/api/purchases?${params}`)
      const json = await res.json()
      setPurchases(json.data ?? [])
      setMeta(json.meta)
    } catch {} finally { setIsLoading(false) }
  }, [vendorId, page])

  useEffect(() => { fetchPurchases() }, [fetchPurchases])

  const columns: Column<Purchase>[] = [
    {
      header: "Kode PO",
      render: (row) => (
        <Link href={`/purchases/${row.id}`} className="font-mono text-xs hover:underline text-primary">
          {row.code}
        </Link>
      ),
    },
    {
      header: "Tanggal",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.purchaseDate), "dd MMM yyyy", { locale: idLocale })}
        </span>
      ),
    },
    {
      header: "Item",
      render: (row) => <span className="text-sm">{row._count.items} item</span>,
    },
    {
      header: "Total",
      render: (row) => <CurrencyDisplay amount={Number(row.totalAmount)} className="font-semibold" />,
    },
    {
      header: "Dibayar",
      render: (row) => <CurrencyDisplay amount={Number(row.paidAmount)} className="text-sm text-green-600" />,
    },
    {
      header: "Sisa Hutang",
      render: (row) => (
        row.vendorDebt && Number(row.vendorDebt.remainingAmount) > 0 ? (
          <CurrencyDisplay amount={Number(row.vendorDebt.remainingAmount)} className="text-sm font-semibold text-red-600" />
        ) : Number(row.changeAmount) > 0 ? (
          <span className="text-xs text-blue-600 font-medium">
            +<CurrencyDisplay amount={Number(row.changeAmount)} className="text-xs text-blue-600" /> deposit
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )
      ),
    },
    {
      header: "Status",
      render: (row) => <StatusBadge status={row.paymentStatus} />,
    },
    {
      header: "Aksi",
      className: "w-[120px] text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={`/purchases/${row.id}`}><Eye className="h-4 w-4" /></Link>
          </Button>
          {row.vendorDebt && row.vendorDebt.status !== "PAID" && (
            <Button
              variant="outline" size="sm" className="h-7 text-xs gap-1"
              onClick={() => setPayTarget({
                debtId: row.vendorDebt!.id,
                maxAmount: Number(row.vendorDebt!.remainingAmount),
              })}
            >
              <Banknote className="h-3.5 w-3.5" />
              Bayar
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={purchases}
        isLoading={isLoading}
        emptyMessage="Belum ada riwayat pembelian"
        emptyDescription="Pembelian dari vendor ini akan muncul di sini"
        keyExtractor={(row) => row.id}
      />
      <Pagination meta={meta} onPageChange={setPage} />

      {payTarget && (
        <VendorPaymentForm
          open={!!payTarget}
          onOpenChange={(open) => !open && setPayTarget(null)}
          vendorId={vendorId}
          vendorName={vendorName}
          mode="invoice"
          vendorDebtId={payTarget.debtId}
          maxAmount={payTarget.maxAmount}
          onSuccess={() => {
            setPayTarget(null)
            fetchPurchases()
            onPaymentSuccess?.()
          }}
        />
      )}
    </div>
  )
}
