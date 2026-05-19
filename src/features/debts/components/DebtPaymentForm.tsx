"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
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
import { FifoAllocationPreview } from "./FifoAllocationPreview"
import { useToast } from "@/hooks/useToast"
import { useDebounce } from "@/hooks/useDebounce"
import { debtPaymentSchema, type DebtPaymentInput } from "../schemas/debt.schema"
import type { FifoPreview } from "../types/debt.types"

interface DebtPaymentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  customerName: string
  onSuccess: () => void
}

export function DebtPaymentForm({
  open,
  onOpenChange,
  customerId,
  customerName,
  onSuccess,
}: DebtPaymentFormProps) {
  const toast = useToast()
  const [preview, setPreview] = useState<FifoPreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [totalOutstanding, setTotalOutstanding] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DebtPaymentInput>({
    resolver: zodResolver(debtPaymentSchema),
    defaultValues: { customerId, amount: 0, notes: "" },
  })

  const amount = watch("amount")
  const debouncedAmount = useDebounce(amount, 500)

  // Fetch total outstanding saat dialog dibuka
  useEffect(() => {
    if (!open) return
    fetch(`/api/customers/${customerId}/debts`)
      .then((r) => r.json())
      .then((json) => {
        const outstanding = json.data?.totalOutstanding ?? 0
        setTotalOutstanding(outstanding)
      })
      .catch(() => {})
  }, [open, customerId])

  // Fetch FIFO preview saat amount berubah
  useEffect(() => {
    if (!open || !debouncedAmount || debouncedAmount <= 0) {
      setPreview(null)
      return
    }
    setIsLoadingPreview(true)
    fetch("/api/debts/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, amount: debouncedAmount }),
    })
      .then((r) => r.json())
      .then((json) => setPreview(json.data ?? null))
      .catch(() => setPreview(null))
      .finally(() => setIsLoadingPreview(false))
  }, [debouncedAmount, customerId, open])

  function handleClose() {
    reset()
    setPreview(null)
    setTotalOutstanding(null)
    onOpenChange(false)
  }

  function handlePayFull() {
    if (totalOutstanding) setValue("amount", totalOutstanding)
  }

  async function onSubmit(data: DebtPaymentInput) {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/debts/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal memproses pembayaran")
      toast.success("Pembayaran hutang berhasil dicatat")
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
          <DialogTitle>Bayar Hutang</DialogTitle>
          <DialogDescription>
            Pembayaran untuk <span className="font-semibold">{customerName}</span>.
            Alokasi otomatis menggunakan metode FIFO (hutang terlama dibayar dulu).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("customerId")} value={customerId} />

          {/* Info total hutang */}
          {totalOutstanding !== null && (
            <div className="flex items-center justify-between rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 px-3 py-2.5">
              <div>
                <p className="text-xs text-muted-foreground">Total Hutang Outstanding</p>
                <p className="text-base font-bold text-red-700 dark:text-red-400">
                  Rp {totalOutstanding.toLocaleString("id-ID")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7 border-red-300 text-red-700 hover:bg-red-100"
                onClick={handlePayFull}
              >
                Bayar Lunas
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pay-amount">Nominal Pembayaran</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input
                id="pay-amount"
                type="number"
                min={1}
                max={totalOutstanding ?? undefined}
                placeholder="0"
                className={`pl-9 text-lg font-semibold h-11 ${isOverLimit ? "border-destructive" : ""}`}
                {...register("amount", { valueAsNumber: true })}
                aria-invalid={!!errors.amount || isOverLimit}
                autoFocus
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
            {isOverLimit && (
              <p className="text-xs text-destructive">
                Nominal melebihi total hutang (Rp {totalOutstanding?.toLocaleString("id-ID")})
              </p>
            )}
          </div>

          {/* FIFO Preview */}
          <FifoAllocationPreview preview={preview} isLoading={isLoadingPreview} />

          <div className="space-y-2">
            <Label htmlFor="pay-notes">
              Catatan <span className="text-muted-foreground">(opsional)</span>
            </Label>
            <Textarea
              id="pay-notes"
              placeholder="Catatan pembayaran..."
              rows={2}
              {...register("notes")}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !amount || amount <= 0 || isOverLimit}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Konfirmasi Pembayaran
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
