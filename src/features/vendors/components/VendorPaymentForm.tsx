"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { z } from "zod"
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
  debtDate: string
  originalAmount: number
  currentRemaining: number
  allocatedAmount: number
  willBeFullyPaid: boolean
  remainingAfter: number
}

interface FifoPreview {
  allocations: FifoAllocation[]
  totalAllocated: number
  remainingChange: number
}

const schema = z.object({
  amount: z.number().min(1, "Nominal minimal Rp 1"),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  notes: z.string().optional(),
})
type FormInput = z.infer<typeof schema>

interface VendorPaymentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorId: string
  vendorName: string
  mode: "fifo" | "invoice"
  vendorDebtId?: string
  maxAmount?: number
  onSuccess: () => void
}

export function VendorPaymentForm({
  open, onOpenChange, vendorId, vendorName, mode, vendorDebtId, maxAmount, onSuccess,
}: VendorPaymentFormProps) {
  const toast = useToast()
  const [preview, setPreview] = useState<FifoPreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [totalOutstanding, setTotalOutstanding] = useState<number | null>(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0, paymentMethod: "CASH", notes: "" },
  })

  const amount = watch("amount")
  const debouncedAmount = useDebounce(amount, 500)

  useEffect(() => {
    if (!open) return
    if (mode === "fifo") {
      fetch(`/api/vendors/${vendorId}/debts`)
        .then((r) => r.json())
        .then((json) => setTotalOutstanding(json.data?.totalOutstanding ?? 0))
        .catch(() => {})
    } else {
      setTotalOutstanding(maxAmount ?? null)
    }
  }, [open, vendorId, mode, maxAmount])

  useEffect(() => {
    if (!open || mode !== "fifo" || !debouncedAmount || debouncedAmount <= 0) {
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
      .then((json) => setPreview(json.data ?? null))
      .catch(() => setPreview(null))
      .finally(() => setIsLoadingPreview(false))
  }, [debouncedAmount, vendorId, mode, open])

  function handleClose() {
    reset()
    setPreview(null)
    setTotalOutstanding(null)
    onOpenChange(false)
  }

  async function onSubmit(data: FormInput) {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/vendor-debts/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          mode,
          vendorDebtId: mode === "invoice" ? vendorDebtId : undefined,
          notes: data.notes,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal memproses pembayaran")
      toast.success("Pembayaran ke vendor berhasil dicatat")
      handleClose()
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isOverLimit = totalOutstanding !== null && amount > totalOutstanding

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bayar Hutang ke Vendor</DialogTitle>
          <DialogDescription>
            Pembayaran ke <span className="font-semibold">{vendorName}</span>.
            {mode === "fifo" ? " Alokasi otomatis FIFO (PO terlama dibayar dulu)." : " Bayar PO spesifik."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Total hutang */}
          {totalOutstanding !== null && (
            <div className="flex items-center justify-between rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 px-3 py-2.5">
              <div>
                <p className="text-xs text-muted-foreground">{mode === "fifo" ? "Total Hutang Outstanding" : "Sisa Hutang PO Ini"}</p>
                <p className="text-base font-bold text-red-700 dark:text-red-400">
                  Rp {totalOutstanding.toLocaleString("id-ID")}
                </p>
              </div>
              <Button
                type="button" variant="outline" size="sm"
                className="text-xs h-7 border-red-300 text-red-700 hover:bg-red-100"
                onClick={() => setValue("amount", totalOutstanding)}
              >
                Bayar Lunas
              </Button>
            </div>
          )}

          {/* Nominal */}
          <div className="space-y-2">
            <Label>Nominal Pembayaran</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input
                type="number" min={1} placeholder="0"
                className={`pl-9 text-lg font-semibold h-11 ${isOverLimit ? "border-destructive" : ""}`}
                {...register("amount", { valueAsNumber: true })}
                autoFocus
              />
            </div>
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            {isOverLimit && <p className="text-xs text-destructive">Nominal melebihi hutang outstanding</p>}
          </div>

          {/* Metode bayar */}
          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <div className="grid grid-cols-2 gap-2">
              {["CASH", "TRANSFER"].map((m) => (
                <button
                  key={m} type="button"
                  onClick={() => setValue("paymentMethod", m as "CASH" | "TRANSFER")}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    watch("paymentMethod") === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                  }`}
                >
                  {m === "CASH" ? "Tunai" : "Transfer"}
                </button>
              ))}
            </div>
          </div>

          {/* FIFO Preview */}
          {mode === "fifo" && preview && preview.allocations.length > 0 && (
            <div className="rounded-md border overflow-hidden text-xs">
              <div className="bg-muted/50 px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
                Preview Alokasi FIFO
              </div>
              <div className="divide-y">
                {preview.allocations.map((alloc) => (
                  <div key={alloc.debtId} className={`flex justify-between px-3 py-2 ${alloc.willBeFullyPaid ? "bg-green-50 dark:bg-green-950/20" : "bg-yellow-50 dark:bg-yellow-950/20"}`}>
                    <div>
                      <p className="font-mono font-semibold">{alloc.purchaseCode}</p>
                      <p className="text-muted-foreground">Sisa <CurrencyDisplay amount={alloc.currentRemaining} className="text-xs" /></p>
                    </div>
                    <div className="text-right">
                      <CurrencyDisplay amount={alloc.allocatedAmount} className="text-xs font-semibold" />
                      <p className={alloc.willBeFullyPaid ? "text-green-600 font-bold" : "text-yellow-600"}>
                        {alloc.willBeFullyPaid ? "LUNAS ✓" : `Sisa Rp ${alloc.remainingAfter.toLocaleString("id-ID")}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {mode === "fifo" && isLoadingPreview && <p className="text-xs text-muted-foreground">Menghitung preview...</p>}

          {/* Catatan */}
          <div className="space-y-2">
            <Label>Catatan <span className="text-muted-foreground">(opsional)</span></Label>
            <Textarea placeholder="Catatan pembayaran..." rows={2} {...register("notes")} />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={isSubmitting}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting || !amount || amount <= 0 || isOverLimit}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Konfirmasi Pembayaran
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
