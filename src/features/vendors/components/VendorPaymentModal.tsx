"use client"

import { useEffect, useState, useRef } from "react"
import { Loader2, Banknote, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { useToast } from "@/hooks/useToast"
import { useDebounce } from "@/hooks/useDebounce"

interface FifoAllocation {
  debtId: string
  purchaseCode: string
  allocatedAmount: number
  willBeFullyPaid: boolean
  remainingAfter: number
  currentRemaining: number
}

interface VendorPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId: string
  vendorName: string
  mode: "fifo" | "invoice"
  vendorDebtId?: string
  maxAmount?: number
  totalOutstanding: number
  onSuccess: () => void
}

export function VendorPaymentModal({
  open, onOpenChange, vendorId, vendorName,
  mode, vendorDebtId, maxAmount, totalOutstanding, onSuccess,
}: VendorPaymentModalProps) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const [rawAmount, setRawAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preview, setPreview] = useState<FifoAllocation[] | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const amount = parseFloat(rawAmount) || 0
  const debouncedAmount = useDebounce(amount, 400)
  const limit = mode === "invoice" ? (maxAmount ?? 0) : totalOutstanding
  // Overpay: bayar lebih dari hutang → kelebihan jadi deposit
  const overpayAmount = limit > 0 && amount > limit ? amount - limit : 0

  // Reset saat modal dibuka
  useEffect(() => {
    if (open) {
      setRawAmount("")
      setPaymentMethod("CASH")
      setNotes("")
      setPreview(null)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Fetch FIFO preview
  useEffect(() => {
    if (!open || mode !== "fifo" || debouncedAmount <= 0) {
      setPreview(null)
      return
    }
    setIsLoadingPreview(true)
    fetch("/api/vendor-debts/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, amount: debouncedAmount }),
    })
      .then((r) => r.json())
      .then((json) => setPreview(json.data?.allocations ?? null))
      .catch(() => setPreview(null))
      .finally(() => setIsLoadingPreview(false))
  }, [debouncedAmount, vendorId, mode, open])

  async function handleSubmit() {
    if (!amount || amount <= 0) return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/vendor-debts/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          amount,
          paymentMethod,
          mode,
          vendorDebtId: mode === "invoice" ? vendorDebtId : undefined,
          notes: notes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal memproses pembayaran")
      toast.success("Pembayaran ke vendor berhasil dicatat")
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = amount > 0 && !isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Bayar Hutang ke Vendor
          </DialogTitle>
          <DialogDescription>
            {vendorName}
            {mode === "fifo"
              ? " · Alokasi otomatis dari PO terlama"
              : " · Bayar PO spesifik"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info hutang */}
          <div className="rounded-lg bg-muted/50 border px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                {mode === "fifo" ? "Total Hutang Outstanding" : "Sisa Hutang PO Ini"}
              </p>
              <CurrencyDisplay
                amount={limit}
                className="text-base font-bold text-red-600"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setRawAmount(String(limit))}
            >
              Bayar Lunas
            </Button>
          </div>

          {/* Input nominal */}
          <div className="space-y-1.5">
            <Label>Nominal Pembayaran</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                Rp
              </span>
              <Input
                ref={inputRef}
                type="number"
                min={1}
                placeholder="0"
                value={rawAmount}
                onChange={(e) => setRawAmount(e.target.value)}
                className={`pl-9 text-xl font-bold h-12 ${overpayAmount > 0 ? "border-blue-400 dark:border-blue-600" : ""}`}
              />
            </div>
            {overpayAmount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 px-3 py-2 text-xs">
                <span className="text-blue-700 dark:text-blue-400 font-medium">
                  Kelebihan <CurrencyDisplay amount={overpayAmount} className="text-xs font-semibold" /> otomatis jadi deposit vendor
                </span>
              </div>
            )}          </div>

          {/* Metode bayar */}
          <div className="space-y-1.5">
            <Label>Metode Pembayaran</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["CASH", "TRANSFER"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    paymentMethod === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {m === "CASH" ? "💵 Tunai" : "🏦 Transfer"}
                </button>
              ))}
            </div>
          </div>

          {/* FIFO Preview */}
          {mode === "fifo" && amount > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Preview Alokasi
              </div>
              {isLoadingPreview ? (
                <div className="px-3 py-3 text-xs text-muted-foreground">Menghitung...</div>
              ) : preview && preview.length > 0 ? (
                <div className="divide-y">
                  {preview.map((alloc) => (
                    <div
                      key={alloc.debtId}
                      className={`flex items-center justify-between px-3 py-2.5 text-xs ${
                        alloc.willBeFullyPaid
                          ? "bg-green-50 dark:bg-green-950/20"
                          : "bg-yellow-50 dark:bg-yellow-950/20"
                      }`}
                    >
                      <div>
                        <p className="font-mono font-semibold">{alloc.purchaseCode}</p>
                        <p className="text-muted-foreground">
                          Sisa <CurrencyDisplay amount={alloc.currentRemaining} className="text-xs" />
                        </p>
                      </div>
                      <div className="text-right">
                        <CurrencyDisplay amount={alloc.allocatedAmount} className="text-xs font-semibold" />
                        {alloc.willBeFullyPaid ? (
                          <p className="text-green-600 font-bold flex items-center gap-0.5 justify-end">
                            <CheckCircle2 className="h-3 w-3" />
                            Lunas
                          </p>
                        ) : (
                          <p className="text-yellow-600">
                            Sisa <CurrencyDisplay amount={alloc.remainingAfter} className="text-xs" />
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Catatan */}
          <div className="space-y-1.5">
            <Label>
              Catatan <span className="text-muted-foreground font-normal">(opsional)</span>
            </Label>
            <Textarea
              placeholder="Catatan pembayaran..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="flex-1 gap-2"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
              ) : (
                <><Banknote className="h-4 w-4" /> Konfirmasi Bayar</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
