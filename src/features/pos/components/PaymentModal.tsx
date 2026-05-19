"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isSubmitting: boolean
}

/** Generate suggest nominal yang cerdas:
 * - Nominal pas (exact)
 * - Pembulatan ke atas ke kelipatan terdekat (5rb, 10rb, 20rb, 50rb, 100rb)
 * - Maksimal 4 suggest, tidak duplikat
 */
function generateSuggests(total: number): number[] {
  const suggests = new Set<number>()
  suggests.add(total) // nominal pas

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
  const change = changeAmount()
  const walkIn = isWalkIn()

  const [fifoPreview, setFifoPreview] = useState<FifoPreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const debouncedPaid = useDebounce(paidAmount, 500)

  const suggests = generateSuggests(total)

  // Reset nominal ke 0 saat modal dibuka
  useEffect(() => {
    if (open) {
      setPaidAmount(0)
      setFifoPreview(null)
    }
  }, [open, setPaidAmount])

  // Fetch FIFO preview — satu useEffect dengan deps stabil
  useEffect(() => {
    if (!open || overpay <= 0 || !customerId || !customerHasDebt) {
      setFifoPreview(null)
      return
    }
    let cancelled = false
    setIsLoadingPreview(true)
    fetch("/api/debts/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, amount: overpay }),
    })
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setFifoPreview(json.data ?? null) })
      .catch(() => { if (!cancelled) setFifoPreview(null) })
      .finally(() => { if (!cancelled) setIsLoadingPreview(false) })
    return () => { cancelled = true }
  }, [open, debouncedPaid, customerId, customerHasDebt, overpay])

  const canConfirm = !isSubmitting && paidAmount > 0 && !(walkIn && debt > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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

          {/* Metode bayar */}
          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableMethods.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method as "CASH" | "TRANSFER")}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    paymentMethod === method
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {method === "CASH" ? "Tunai" : "Transfer"}
                </button>
              ))}
            </div>
          </div>

          {/* Nominal bayar */}
          <div className="space-y-2">
            <Label htmlFor="paid-amount">Nominal Bayar</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input
                id="paid-amount"
                type="number"
                min={0}
                value={paidAmount || ""}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="pl-9 text-lg font-semibold h-12"
                placeholder="0"
                autoFocus
              />
            </div>

            {/* Suggest nominal cerdas */}
            <div className="flex flex-wrap gap-1.5">
              {suggests.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPaidAmount(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    paidAmount === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted"
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
          {paidAmount > 0 && (
            <div className="space-y-2 text-sm">
              {debt > 0 && (
                <div className={`flex justify-between font-medium ${walkIn ? "text-destructive" : "text-red-600"}`}>
                  <span>{walkIn ? "⚠ Walk-in harus bayar lunas" : "Hutang"}</span>
                  {!walkIn && <CurrencyDisplay amount={debt} className="text-sm font-semibold text-red-600" />}
                </div>
              )}
              {change > 0 && (
                <div className="flex justify-between font-medium text-green-600">
                  <span>Kembalian</span>
                  <CurrencyDisplay amount={change} className="text-sm font-semibold text-green-600" />
                </div>
              )}
              {overpay > 0 && customerHasDebt && (
                <div className="flex justify-between text-amber-600">
                  <span>Kelebihan → hutang lama</span>
                  <CurrencyDisplay amount={overpay} className="text-sm text-amber-600" />
                </div>
              )}
              {paidAmount === total && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>✓ Nominal pas</span>
                  <span>Tidak ada kembalian</span>
                </div>
              )}
            </div>
          )}

          {/* FIFO Preview */}
          {overpay > 0 && customerHasDebt && (
            <DebtAllocationPreview preview={fifoPreview} isLoading={isLoadingPreview} />
          )}

          {/* Tombol konfirmasi */}
          <Button
            className="w-full h-11"
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...</>
            ) : (
              "Konfirmasi Pembayaran"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
