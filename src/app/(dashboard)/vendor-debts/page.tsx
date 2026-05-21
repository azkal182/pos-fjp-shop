"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  TrendingDown, Building2, ChevronRight, Phone, Clock,
  AlertCircle, CheckCircle2, Wallet,
} from "lucide-react"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/useToast"

interface VendorRow {
  vendor: { id: string; name: string; phone: string | null; address: string | null }
  totalOutstanding: number
  activeDebtsCount: number
  oldestDays: number
  depositBalance: number
  hasDebt: boolean
  hasDeposit: boolean
}

interface SummaryData {
  vendors: VendorRow[]
  grandTotal: number
  vendorCount: number
}

export default function VendorDebtsPage() {
  const router = useRouter()
  const toast = useToast()
  const [data, setData] = useState<SummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSummary = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/vendor-debts/summary")
      const json = await res.json()
      setData(json.data ?? null)
    } catch {
      toast.error("Gagal memuat data hutang vendor")
    } finally {
      setIsLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSummary() }, [fetchSummary])

  return (
    <PageWrapper title="Hutang ke Vendor">
      {/* Summary header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
            <TrendingDown className="h-3.5 w-3.5" />
            Total Hutang ke Vendor
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <CurrencyDisplay amount={data?.grandTotal ?? 0} className="text-2xl font-bold text-red-600" />
          )}
        </div>
        <div className="rounded-xl border bg-card p-5 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
            <Building2 className="h-3.5 w-3.5" />
            Vendor Berpiutang
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold">{data?.vendorCount ?? 0}</p>
          )}
        </div>
      </div>

      {/* Vendor list */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-7 w-28" />
              </div>
            </div>
          ))
        ) : !data || data.vendors.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Belum ada vendor aktif</p>
          </div>
        ) : (
          data.vendors.map((item) => (
            <button
              key={item.vendor.id}
              onClick={() => router.push(`/vendor-debts/${item.vendor.id}`)}
              className="w-full rounded-xl border bg-card p-4 text-left hover:bg-accent/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                {/* Status icon */}
                <div className="shrink-0">
                  {item.hasDebt ? (
                    <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                      <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                  ) : item.hasDeposit ? (
                    <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  )}
                </div>

                {/* Info vendor */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{item.vendor.name}</p>
                    {item.hasDebt && item.oldestDays > 30 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 text-[10px] font-semibold shrink-0">
                        <AlertCircle className="h-3 w-3" />
                        {item.oldestDays}h
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                    {item.vendor.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {item.vendor.phone}
                      </span>
                    )}
                    {item.hasDebt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.activeDebtsCount} PO belum lunas · terlama {item.oldestDays}h
                      </span>
                    )}
                    {!item.hasDebt && !item.hasDeposit && (
                      <span className="text-green-600 dark:text-green-400 font-medium">Tidak ada hutang</span>
                    )}
                    {!item.hasDebt && item.hasDeposit && (
                      <span className="text-blue-600 dark:text-blue-400 font-medium">Tidak ada hutang</span>
                    )}
                  </div>
                </div>

                {/* Kanan: nominal */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right space-y-0.5">
                    {item.hasDebt && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Hutang</p>
                        <CurrencyDisplay
                          amount={item.totalOutstanding}
                          className="text-sm font-bold text-red-600"
                        />
                      </div>
                    )}
                    {item.hasDeposit && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Deposit</p>
                        <CurrencyDisplay
                          amount={item.depositBalance}
                          className="text-sm font-bold text-blue-600"
                        />
                      </div>
                    )}
                    {!item.hasDebt && !item.hasDeposit && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </PageWrapper>
  )
}
