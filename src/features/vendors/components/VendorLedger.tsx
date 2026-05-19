"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface LedgerEntry {
  id: string
  type: string
  direction: string
  amount: number
  runningBalance: number
  description: string
  paymentMethod: string | null
  referenceType: string | null
  referenceId: string | null
  notes: string | null
  createdAt: string
}

interface LedgerData {
  entries: LedgerEntry[]
  balance: number
  totalEntries: number
}

const TYPE_LABELS: Record<string, string> = {
  INVOICE: "Tagihan PO",
  PAYMENT_OUT: "Bayar ke Vendor",
  DEPOSIT_IN: "Deposit Masuk",
  DEPOSIT_OUT: "Deposit Dipakai",
  ADJUSTMENT: "Penyesuaian",
}

export function VendorLedger({ vendorId, refreshKey }: { vendorId: string; refreshKey?: number }) {
  const [data, setData] = useState<LedgerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/vendors/${vendorId}/ledger`)
      .then((r) => r.json())
      .then((json) => setData(json.data ?? null))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [vendorId, refreshKey])

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Buku Besar Vendor</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  if (!data || data.entries.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Buku Besar Vendor</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat transaksi dengan vendor ini</p>
        </CardContent>
      </Card>
    )
  }

  // Hitung total debit dan kredit
  const totalDebit = data.entries.filter((e) => e.direction === "DEBIT").reduce((s, e) => s + Number(e.amount), 0)
  const totalCredit = data.entries.filter((e) => e.direction === "CREDIT").reduce((s, e) => s + Number(e.amount), 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Buku Besar Vendor</CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Saldo Hutang</p>
            <CurrencyDisplay
              amount={data.balance}
              className={`text-lg font-bold ${data.balance > 0 ? "text-red-600" : "text-green-600"}`}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mb-0.5">
              <TrendingDown className="h-3 w-3" />
              Total Tagihan
            </div>
            <CurrencyDisplay amount={totalDebit} className="text-sm font-semibold text-red-700 dark:text-red-400" />
          </div>
          <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 mb-0.5">
              <TrendingUp className="h-3 w-3" />
              Total Dibayar
            </div>
            <CurrencyDisplay amount={totalCredit} className="text-sm font-semibold text-green-700 dark:text-green-400" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-[1fr_100px_100px_100px] gap-2 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-y">
          <span>Keterangan</span>
          <span className="text-right">Tagihan (+)</span>
          <span className="text-right">Bayar (−)</span>
          <span className="text-right">Saldo</span>
        </div>

        <div className="divide-y">
          {data.entries.map((entry) => {
            const isDebit = entry.direction === "DEBIT"
            return (
              <div key={entry.id} className={`grid grid-cols-[1fr_100px_100px_100px] gap-2 px-4 py-2.5 text-sm items-center ${isDebit ? "bg-red-50/30 dark:bg-red-950/10" : "bg-green-50/30 dark:bg-green-950/10"}`}>
                <div className="min-w-0">
                  <p className={`font-medium truncate ${isDebit ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
                    {TYPE_LABELS[entry.type] ?? entry.type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(entry.createdAt), "dd MMM yyyy HH:mm", { locale: idLocale })}
                    {entry.notes && ` · ${entry.notes}`}
                  </p>
                </div>
                <div className="text-right">
                  {isDebit && <CurrencyDisplay amount={Number(entry.amount)} className="text-sm font-medium text-red-600 dark:text-red-400" />}
                </div>
                <div className="text-right">
                  {!isDebit && <CurrencyDisplay amount={Number(entry.amount)} className="text-sm font-medium text-green-600 dark:text-green-400" />}
                </div>
                <div className="text-right">
                  <CurrencyDisplay
                    amount={Number(entry.runningBalance)}
                    className={`text-sm font-semibold ${Number(entry.runningBalance) > 0 ? "text-red-600" : "text-green-600"}`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
