"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface LedgerEntry {
  date: string
  type: "DEBT" | "PAYMENT" | "DEPOSIT_IN" | "DEPOSIT_OUT" | "DEPOSIT_RETURN"
  description: string
  debit: number
  credit: number
  balance: number
  reference: string
  id: string
  meta?: {
    notes?: string
    allocations?: { debtCode: string; amount: number }[]
  }
}

interface LedgerData {
  ledger: LedgerEntry[]
  totalDebt: number
  totalPaid: number
  totalDepositIn: number
  totalDepositOut: number
  currentBalance: number
}

interface CustomerLedgerProps {
  customerId: string
  refreshKey?: number
}

export function CustomerLedger({ customerId, refreshKey }: CustomerLedgerProps) {
  const [data, setData] = useState<LedgerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/customers/${customerId}/ledger`)
      .then((r) => r.json())
      .then((json) => setData(json.data ?? null))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [customerId, refreshKey])

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Buku Hutang</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.ledger || data.ledger.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Buku Hutang</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat hutang</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Buku Hutang</CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Saldo Hutang</p>
            <CurrencyDisplay
              amount={data.currentBalance}
              className={`text-lg font-bold ${data.currentBalance > 0 ? "text-red-600" : "text-green-600"}`}
            />
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mb-0.5">
              <TrendingDown className="h-3 w-3" />
              Total Hutang
            </div>
            <CurrencyDisplay amount={data.totalDebt} className="text-sm font-semibold text-red-700 dark:text-red-400" />
          </div>
          <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 mb-0.5">
              <TrendingUp className="h-3 w-3" />
              Bayar Hutang
            </div>
            <CurrencyDisplay amount={data.totalPaid} className="text-sm font-semibold text-green-700 dark:text-green-400" />
          </div>
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 mb-0.5">
              <TrendingUp className="h-3 w-3" />
              Deposit Masuk
            </div>
            <CurrencyDisplay amount={data.totalDepositIn} className="text-sm font-semibold text-blue-700 dark:text-blue-400" />
          </div>
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 mb-0.5">
              <TrendingDown className="h-3 w-3" />
              Deposit Dipakai
            </div>
            <CurrencyDisplay amount={data.totalDepositOut} className="text-sm font-semibold text-amber-700 dark:text-amber-400" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_100px_100px_100px] gap-2 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-y">
          <span>Keterangan</span>
          <span className="text-right">Hutang (+)</span>
          <span className="text-right">Bayar (−)</span>
          <span className="text-right">Saldo</span>
        </div>

        {/* Entries */}
        <div className="divide-y">
          {data.ledger.map((entry) => {
            const isExpanded = expandedId === entry.id
            const hasDetail = entry.type === "PAYMENT" && entry.meta?.allocations?.length
            const isDebit = entry.debit > 0

            return (
              <div key={entry.id}>
                <div
                  className={`grid grid-cols-[1fr_100px_100px_100px] gap-2 px-4 py-2.5 text-sm items-center ${
                    hasDetail ? "cursor-pointer hover:bg-muted/30" : ""
                  } ${isDebit ? "bg-red-50/30 dark:bg-red-950/10" : "bg-green-50/30 dark:bg-green-950/10"}`}
                  onClick={() => hasDetail && setExpandedId(isExpanded ? null : entry.id)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {hasDetail && (
                        isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className={`font-medium truncate ${isDebit ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
                        {entry.description}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-5">
                      {format(new Date(entry.date), "dd MMM yyyy HH:mm", { locale: idLocale })}
                      {entry.meta?.notes && ` · ${entry.meta.notes}`}
                    </p>
                  </div>

                  <div className="text-right">
                    {entry.debit > 0 && (
                      <CurrencyDisplay amount={entry.debit} className="text-sm font-medium text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="text-right">
                    {entry.credit > 0 && (
                      <CurrencyDisplay amount={entry.credit} className="text-sm font-medium text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div className="text-right">
                    <CurrencyDisplay
                      amount={entry.balance}
                      className={`text-sm font-semibold ${entry.balance > 0 ? "text-red-600" : "text-green-600"}`}
                    />
                  </div>
                </div>

                {/* Detail alokasi */}
                {isExpanded && entry.meta?.allocations && (
                  <div className="bg-muted/20 border-t px-8 py-2 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Detail Alokasi
                    </p>
                    {entry.meta.allocations.map((alloc, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="font-mono text-muted-foreground">{alloc.debtCode}</span>
                        <CurrencyDisplay amount={alloc.amount} className="text-xs font-medium" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
