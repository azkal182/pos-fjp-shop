"use client"

import { useEffect, useState } from "react"
import { Loader2, Wallet, ArrowDownLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { DebtAllocationPreview } from "./DebtAllocationPreview"
import { useCartStore } from "../stores/cart.store"
import { useSettingsStore } from "@/stores/settings.store"
import { useDebounce } from "@/hooks/useDebounce"
import type { FifoPreview } from "@/features/debts/types/debt.types"

interface DepositInfo {
  totalBalance: number
  deposits: { id: string; balance: number; source: string }[]
}

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (opts: { overpayAction: "return" | "deposit"; depositUsed: number; depositId?: string }) => Promise<void>
  isSubmitting: boolean
}

function generateSuggests(total: number): number[] {
  const suggests = new Set<number>()
  suggests.add(total)
  const roundings = [5_000, 10_000, 20_000, 50_000, 100_000]
  for (const r of roundings) {
    const rounded = Math.ceil(total / r) * r
    if (rounded > total) suggests.add(rounded)
    if (suggests.size >= 4) break
  }
  return Array.from(suggests).slice(0, 4)
}

function formatShort(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}jt`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}rb`
  return amount.toLocaleString("id-ID")
}

export function PaymentModal({ open, onOpenChange, onConfirm, isSubmitting }: PaymentModalProps) {
  const {
    customerId, customerName, customerHasDebt,
    paymentMethod, setPaymentMethod,
    paidAmount, setPaidAmount,
    totalAmount, debtAmount, overpayAmount, changeAmount, isWalkIn,
  } = useCartStore()

  const { pos, load } = useSettingsStore()
  const availableMethods = pos.paymentMethods.length > 0 ? pos.paymentMethods : ["CASH", "TRANSFER"]

  useEffect(() => { load() }, [load])

  const total = totalAmount()
  const debt = debtAmount()
  const overpay = overpayAmount()
  const walkIn = isWalkIn()

  const [fifoPreview, setFifoPreview] = useState<FifoPreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [overpayAction, setOverpayAction] = useState<"return" | "deposit">("return")
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null)
  const [useDepositChecked, setUseDepositChecked] = useState(false)
  const debouncedPaid = useDebounce(paidAmount, 500)

  const suggests = generateSuggests(total)

  // Deposit yang dipakai
  const depositUsed = useDepositChecked && depositInfo ? Math.min(depositInfo.totalBalance, total - paidAmount) : 0
  const effectiveTotal = total - depositUsed
  const effectivePaid = paidAmount + depositUsed
  const effectiveDebt = Math.max(0, total - effectivePaid)
  const effectiveOverpay = Math.max(0, effectivePaid - total)
  const effectiveChange = overpayAction === "return" ? effectiveOverpay : 0

  // Reset saat modal dibuka
  useEffect(() => {
    if (open) {
      setPaidAmount(0)
      setFifoPreview(null)
      setOverpayAction("return")
      setUseDepositChecked(false)
      // Fetch deposit customer
      if (customerId) {
        fetch(`/api/customers/${customerId}/deposit`)
          .then((r) => r.json())
          .then((json) => setDepositInfo(json.data ?? null))
          .catch(() => setDepositInfo(null))
      }
    }
  }, [open, customerId, setPaidAmount])

  // Fetch FIFO preview
  useEffect(() => {
    if (!open || effectiveOverpay <= 0 || !customerId || !customerHasDebt) {
      setFifoPreview(null)
      return
    }
    let cancelled = false
    setIsLoadingPreview(true)
    fetch("/api/debts/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, amount: effectiveOverpay }),
    })
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setFifoPreview(json.data ?? null) })
      .catch(() => { if (!cancelled) setFifoPreview(null) })
      .finally(() => { if (!cancelled) setIsLoadingPreview(false) })
    return () => { cancelled = true }
  }, [open, debouncedPaid, customerId, customerHasDebt, effectiveOverpay])

  const canConfirm = !isSubmitting && paidAmount > 0 && !(walkIn && effectiveDebt > 0)

  function handleConfirm() {
    const firstDeposit = depositInfo?.deposits[0]
    onConfirm({
      overpayAction,
      depositUsed,
      depositId: useDepositChecked && firstDeposit ? firstDeposit.id : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info customer + total */}
          <div className="rounded-md bg-muted/40 px-3 py-2.5 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">{customerName ?? "Walk-in"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Tagihan</span>
              <CurrencyDisplay amount={total} className="font-bold text-base" />
            </div>
          </div>

          {/* Deposit customer tersedia */}
          {depositInfo && depositInfo.totalBalance > 0 && (
            <div className="flex items-center gap-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 px-3 py-2.5">
              <Wallet className="h-4 w-4 text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Deposit Tersedia</p>
                <CurrencyDisplay amount={depositInfo.totalBalance} className="text-sm font-bold text-blue-700 dark:text-blue-400" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="use-deposit"
                  checked={useDepositChecked}
                  onCheckedChange={(v) => setUseDepositChecked(!!v)}
                />
                <Label htmlFor="use-deposit" className="text-xs cursor-pointer">Gunakan</Label>
              </div>
            </div>
          )}

          {/* Jika deposit dipakai, tampilkan info */}
          {useDepositChecked && depositUsed > 0 && (
            <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 rounded-md px-3 py-2">
              Deposit <CurrencyDisplay amount={depositUsed} className="text-xs font-semibold" /> akan dipakai.
              Sisa bayar tunai: <CurrencyDisplay amount={Math.max(0, effectiveTotal)} className="text-xs font-semibold" />
            </div>
          )}

          {/* Metode bayar */}
          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableMethods.map((method) => (
                <button
                  key={method} type="button"
                  onClick={() => setPaymentMethod(method as "CASH" | "TRANSFER")}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    paymentMethod === method ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                  }`}
                >
                  {method === "CASH" ? "Tunai" : "Transfer"}
                </button>
              ))}
            </div>
          </div>

          {/* Nominal bayar */}
          <div className="space-y-2">
            <Label htmlFor="paid-amount">
              Nominal Bayar {useDepositChecked && depositUsed > 0 ? "(Tunai)" : ""}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input
                id="paid-amount"
                type="number" min={0}
                value={paidAmount || ""}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="pl-9 text-lg font-semibold h-12"
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggests.map((s) => (
                <button
                  key={s} type="button"
                  onClick={() => setPaidAmount(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    paidAmount === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
                  }`}
                >
                  {s === total ? (
                    <span className="flex items-center gap-1">
                      <span className="text-[10px] opacity-70">Pas</span>
                      {formatShort(s)}
                    </span>
                  ) : formatShort(s)}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Hasil kalkulasi */}
          {(paidAmount > 0 || depositUsed > 0) && (
            <div className="space-y-2 text-sm">
              {effectiveDebt > 0 && (
                <div className={`flex justify-between font-medium ${walkIn ? "text-destructive" : "text-red-600"}`}>
                  <span>{walkIn ? "⚠ Walk-in harus bayar lunas" : "Hutang"}</span>
                  {!walkIn && <CurrencyDisplay amount={effectiveDebt} className="text-sm font-semibold text-red-600" />}
                </div>
              )}
              {effectiveChange > 0 && (
                <div className="flex justify-between font-medium text-green-600">
                  <span>Kembalian</span>
                  <CurrencyDisplay amount={effectiveChange} className="text-sm font-semibold text-green-600" />
                </div>
              )}
              {effectiveOverpay > 0 && customerHasDebt && (
                <div className="flex justify-between text-amber-600">
                  <span>Kelebihan → hutang lama</span>
                  <CurrencyDisplay amount={effectiveOverpay} className="text-sm text-amber-600" />
                </div>
              )}
              {effectivePaid === total && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>✓ Nominal pas</span>
                  <span>Tidak ada kembalian</span>
                </div>
              )}
            </div>
          )}

          {/* Pilihan overpay action — hanya jika overpay dan tidak ada hutang lama */}
          {effectiveOverpay > 0 && !customerHasDebt && customerId && (
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Kelebihan Bayar: <CurrencyDisplay amount={effectiveOverpay} className="text-xs font-bold text-foreground" />
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOverpayAction("return")}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                    overpayAction === "return" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                  }`}
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  Kembalikan Tunai
                </button>
                <button
                  type="button"
                  onClick={() => setOverpayAction("deposit")}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                    overpayAction === "deposit" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                  }`}
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Simpan Deposit
                </button>
              </div>
              {overpayAction === "deposit" && (
                <p className="text-xs text-muted-foreground">
                  Deposit akan disimpan dan bisa dipakai di transaksi berikutnya
                </p>
              )}
            </div>
          )}

          {/* FIFO Preview */}
          {effectiveOverpay > 0 && customerHasDebt && (
            <DebtAllocationPreview preview={fifoPreview} isLoading={isLoadingPreview} />
          )}

          <Button className="w-full h-11" onClick={handleConfirm} disabled={!canConfirm}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...</>
            ) : "Konfirmasi Pembayaran"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
