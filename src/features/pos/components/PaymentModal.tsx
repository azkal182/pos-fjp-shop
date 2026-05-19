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
import { useDebounce } from "@/hooks/useDebounce"
import type { FifoPreview } from "@/features/debts/types/debt.types"

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isSubmitting: boolean
}

export function PaymentModal({ open, onOpenChange, onConfirm, isSubmitting }: PaymentModalProps) {
  const {
    customerId, customerName, customerHasDebt,
    paymentMethod, setPaymentMethod,
    paidAmount, setPaidAmount,
    totalAmount, debtAmount, overpayAmount, changeAmount, isWalkIn,
  } = useCartStore()

  const total = totalAmount()
  const debt = debtAmount()
  const overpay = overpayAmount()
  const change = changeAmount()
  const walkIn = isWalkIn()

  const [fifoPreview, setFifoPreview] = useState<FifoPreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const debouncedPaid = useDebounce(paidAmount, 500)

  // Fetch FIFO preview saat overpay dan customer punya hutang lama
  useEffect(() => {
    if (!open) return
    if (overpay > 0 && customerId && customerHasDebt) {
      setIsLoadingPreview(true)
      fetch("/api/debts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, amount: overpay }),
      })
        .then((r) => r.json())
        .then((json) => setFifoPreview(json.data ?? null))
        .catch(() => setFifoPreview(null))
        .finally(() => setIsLoadingPreview(false))
    } else {
      setFifoPreview(null)
    }
  }, [debouncedPaid, customerId, customerHasDebt, overpay, open])

  // Reset paidAmount ke total saat modal dibuka
  useEffect(() => {
    if (open) setPaidAmount(total)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const canConfirm = !isSubmitting && !(walkIn && debt > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info customer */}
          <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">{customerName ?? "Walk-in"}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Total Tagihan</span>
              <CurrencyDisplay amount={total} className="font-bold text-base" />
            </div>
          </div>

          {/* Metode bayar */}
          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <div className="grid grid-cols-2 gap-2">
              {["CASH", "TRANSFER"].map((method) => (
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
            <Input
              id="paid-amount"
              type="number"
              min={0}
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              className="text-lg font-semibold h-11"
              autoFocus
            />
          </div>

          <Separator />

          {/* Hasil kalkulasi */}
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
              <div className="flex justify-between text-yellow-600">
                <span>Kelebihan → dialokasikan ke hutang lama</span>
                <CurrencyDisplay amount={overpay} className="text-sm text-yellow-600" />
              </div>
            )}
          </div>

          {/* FIFO Preview */}
          {(overpay > 0 && customerHasDebt) && (
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
