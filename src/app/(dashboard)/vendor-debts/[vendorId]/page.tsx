"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Plus, Banknote, Phone, MapPin, CheckCircle2,
  Clock, TrendingDown, TrendingUp, Wallet, RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/useToast"
import { VendorPaymentModal } from "@/features/vendors/components/VendorPaymentModal"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface Vendor {
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
}

interface VendorDebt {
  id: string
  purchaseId: string
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  status: string
  debtDate: string
  purchase: { code: string; purchaseDate: string }
}

interface DebtSummary {
  totalOutstanding: number
  activeDebtsCount: number
  oldestDays: number | null
  debts: VendorDebt[]
}

interface LedgerEntry {
  id: string
  type: string
  direction: string
  amount: number
  runningBalance: number
  description: string
  paymentMethod: string | null
  notes: string | null
  createdAt: string
}

interface LedgerData {
  entries: LedgerEntry[]
  balance: number
  totalDebit: number
  totalCredit: number
}

const TYPE_LABELS: Record<string, string> = {
  INVOICE: "Tagihan PO",
  PAYMENT_OUT: "Bayar ke Vendor",
  DEPOSIT_IN: "Deposit Masuk",
  DEPOSIT_OUT: "Deposit Dipakai",
  ADJUSTMENT: "Penyesuaian",
}

export default function VendorDebtDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const vendorId = params.vendorId as string

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [summary, setSummary] = useState<DebtSummary | null>(null)
  const [ledger, setLedger] = useState<LedgerData | null>(null)
  const [deposit, setDeposit] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLedgerLoading, setIsLedgerLoading] = useState(true)
  const [isRecalculating, setIsRecalculating] = useState(false)

  // Payment modal state
  const [payModal, setPayModal] = useState<{
    open: boolean
    mode: "fifo" | "invoice"
    debtId?: string
    maxAmount?: number
  }>({ open: false, mode: "fifo" })

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    try {
      const [vendorRes, summaryRes, depositRes] = await Promise.all([
        fetch(`/api/vendors/${vendorId}`),
        fetch(`/api/vendors/${vendorId}/debts`),
        fetch(`/api/vendors/${vendorId}/deposit`),
      ])
      const [vendorJson, summaryJson, depositJson] = await Promise.all([
        vendorRes.json(),
        summaryRes.json(),
        depositRes.json(),
      ])
      if (!vendorRes.ok) { router.push("/vendor-debts"); return }
      setVendor(vendorJson.data)
      setSummary(summaryJson.data)
      setDeposit(depositJson.data?.totalBalance ?? 0)
    } catch {
      toast.error("Gagal memuat data vendor")
    } finally {
      setIsLoading(false)
    }
  }, [vendorId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLedger = useCallback(async () => {
    setIsLedgerLoading(true)
    try {
      const res = await fetch(`/api/vendors/${vendorId}/ledger`)
      const json = await res.json()
      setLedger(json.data ?? null)
    } catch {} finally {
      setIsLedgerLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    fetchAll()
    fetchLedger()
  }, [fetchAll, fetchLedger])

  async function handleRecalculate() {
    setIsRecalculating(true)
    try {
      const res = await fetch(`/api/vendors/${vendorId}/ledger`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal")
      toast.success(`Saldo diperbaiki: ${json.data.fixed} entry diperbarui`)
      fetchLedger()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsRecalculating(false)
    }
  }

  function handlePaymentSuccess() {
    fetchAll()
    fetchLedger()
  }

  if (isLoading || !vendor) return <LoadingSpinner centered />

  const hasDebt = summary && summary.totalOutstanding > 0
  const isCredit = ledger && ledger.balance < 0

  return (
    <PageWrapper
      title={vendor.name}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Kembali
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/purchases/new?vendorId=${vendorId}`)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Pembelian Baru
          </Button>
          {hasDebt && (
            <Button
              size="sm"
              onClick={() => setPayModal({ open: true, mode: "fifo" })}
            >
              <Banknote className="h-4 w-4 mr-1.5" />
              Bayar Hutang
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Sidebar kiri ── */}
        <div className="space-y-4">
          {/* Info vendor */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="space-y-1">
              <p className="font-semibold text-base">{vendor.name}</p>
              {vendor.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {vendor.phone}
                </p>
              )}
              {vendor.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {vendor.address}
                </p>
              )}
            </div>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              vendor.isActive
                ? "bg-green-100 text-green-800 border-green-200"
                : "bg-gray-100 text-gray-600 border-gray-200"
            }`}>
              {vendor.isActive ? "Aktif" : "Nonaktif"}
            </span>
          </div>

          {/* Ringkasan hutang */}
          {hasDebt ? (
            <div className="rounded-xl border border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <TrendingDown className="h-4 w-4" />
                <span className="text-sm font-semibold">Hutang ke Vendor</span>
              </div>
              <CurrencyDisplay
                amount={summary.totalOutstanding}
                className="text-2xl font-bold text-red-700 dark:text-red-400"
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>{summary.activeDebtsCount} PO belum lunas</p>
                {summary.oldestDays !== null && (
                  <p className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    PO terlama: <span className="font-medium text-foreground">{summary.oldestDays} hari</span>
                  </p>
                )}
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => setPayModal({ open: true, mode: "fifo" })}
              >
                <Banknote className="h-4 w-4" />
                Bayar Semua (FIFO)
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Tidak ada hutang</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Semua PO sudah lunas</p>
            </div>
          )}

          {/* Deposit */}
          {deposit > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Wallet className="h-4 w-4" />
                <span className="text-sm font-semibold">Saldo Deposit</span>
              </div>
              <CurrencyDisplay
                amount={deposit}
                className="text-xl font-bold text-blue-700 dark:text-blue-400"
              />
              <p className="text-xs text-muted-foreground">Kelebihan bayar yang tersimpan</p>
            </div>
          )}
        </div>

        {/* ── Konten utama ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daftar hutang per PO */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Hutang per PO</h3>
              {hasDebt && (
                <span className="text-xs text-muted-foreground">{summary.activeDebtsCount} belum lunas</span>
              )}
            </div>

            {!summary || summary.debts.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Semua PO sudah lunas</p>
              </div>
            ) : (
              <div className="divide-y">
                {summary.debts.map((debt) => (
                  <div key={debt.id} className="px-4 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{debt.purchase.code}</span>
                        <StatusBadge status={debt.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {debt.purchase.purchaseDate
                          ? format(new Date(debt.purchase.purchaseDate), "dd MMM yyyy", { locale: idLocale })
                          : debt.debtDate
                          ? format(new Date(debt.debtDate), "dd MMM yyyy", { locale: idLocale })
                          : "—"}
                        {" · "}Total PO: <CurrencyDisplay amount={Number(debt.originalAmount)} className="text-xs" />
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <CurrencyDisplay
                        amount={Number(debt.remainingAmount)}
                        className="text-sm font-bold text-red-600"
                      />
                      <p className="text-xs text-muted-foreground">
                        Terbayar: <CurrencyDisplay amount={Number(debt.paidAmount)} className="text-xs text-green-600" />
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 shrink-0"
                      onClick={() => setPayModal({
                        open: true,
                        mode: "invoice",
                        debtId: debt.id,
                        maxAmount: Number(debt.remainingAmount),
                      })}
                    >
                      <Banknote className="h-3.5 w-3.5" />
                      Bayar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buku Besar */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Buku Besar</h3>
              <div className="flex items-center gap-2">
                {ledger && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {isCredit ? "Kredit (Deposit)" : "Saldo Hutang"}
                    </p>
                    <CurrencyDisplay
                      amount={Math.abs(ledger.balance)}
                      className={`text-sm font-bold ${
                        isCredit ? "text-blue-600" : ledger.balance > 0 ? "text-red-600" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={handleRecalculate}
                  disabled={isRecalculating}
                >
                  <RefreshCw className={`h-3 w-3 ${isRecalculating ? "animate-spin" : ""}`} />
                  Perbaiki
                </Button>
              </div>
            </div>

            {/* Summary row */}
            {ledger && (
              <div className="grid grid-cols-2 gap-3 px-4 py-3 border-b bg-muted/10">
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs text-red-600 mb-0.5">
                    <TrendingDown className="h-3 w-3" />
                    Total Tagihan
                  </div>
                  <CurrencyDisplay amount={ledger.totalDebit} className="text-sm font-semibold text-red-700 dark:text-red-400" />
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs text-green-600 mb-0.5">
                    <TrendingUp className="h-3 w-3" />
                    Total Dibayar
                  </div>
                  <CurrencyDisplay amount={ledger.totalCredit} className="text-sm font-semibold text-green-700 dark:text-green-400" />
                </div>
              </div>
            )}

            {isLedgerLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !ledger || ledger.entries.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">Belum ada riwayat transaksi</p>
              </div>
            ) : (
              <>
                {/* Header kolom */}
                <div className="hidden sm:grid grid-cols-[1fr_100px_100px_110px] gap-2 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b">
                  <span>Keterangan</span>
                  <span className="text-right">Tagihan (+)</span>
                  <span className="text-right">Bayar (−)</span>
                  <span className="text-right">Saldo</span>
                </div>
                <div className="divide-y">
                  {ledger.entries.map((entry) => {
                    const isDebit = entry.direction === "DEBIT"
                    const balance = Number(entry.runningBalance)
                    return (
                      <div
                        key={entry.id}
                        className={`grid grid-cols-[1fr_100px_100px_110px] gap-2 px-4 py-2.5 text-sm items-center ${
                          isDebit ? "bg-red-50/30 dark:bg-red-950/10" : "bg-green-50/30 dark:bg-green-950/10"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className={`font-medium text-sm truncate ${
                            isDebit ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"
                          }`}>
                            {TYPE_LABELS[entry.type] ?? entry.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.createdAt), "dd MMM yyyy HH:mm", { locale: idLocale })}
                            {entry.notes && ` · ${entry.notes}`}
                          </p>
                        </div>
                        <div className="text-right">
                          {isDebit && (
                            <CurrencyDisplay amount={Number(entry.amount)} className="text-sm font-medium text-red-600" />
                          )}
                        </div>
                        <div className="text-right">
                          {!isDebit && (
                            <CurrencyDisplay amount={Number(entry.amount)} className="text-sm font-medium text-green-600" />
                          )}
                        </div>
                        <div className="text-right">
                          {balance < 0 ? (
                            <span className="text-sm font-semibold text-blue-600">
                              +<CurrencyDisplay amount={Math.abs(balance)} className="text-sm font-semibold text-blue-600" />
                              <span className="text-[10px] ml-0.5 opacity-70">kredit</span>
                            </span>
                          ) : (
                            <CurrencyDisplay
                              amount={balance}
                              className={`text-sm font-semibold ${balance > 0 ? "text-red-600" : "text-muted-foreground"}`}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <VendorPaymentModal
        open={payModal.open}
        onOpenChange={(open) => setPayModal((prev) => ({ ...prev, open }))}
        vendorId={vendorId}
        vendorName={vendor.name}
        mode={payModal.mode}
        vendorDebtId={payModal.debtId}
        maxAmount={payModal.maxAmount}
        totalOutstanding={summary?.totalOutstanding ?? 0}
        onSuccess={handlePaymentSuccess}
      />
    </PageWrapper>
  )
}
