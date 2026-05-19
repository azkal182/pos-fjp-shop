"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Wallet, ArrowDownLeft, Loader2 } from "lucide-react"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { useToast } from "@/hooks/useToast"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface Deposit {
  id: string
  amount: number
  balance: number
  usedAmount: number
  returnedAmount: number
  source: string
  createdAt: string
  usages: { id: string; amount: number; usageType: string; createdAt: string }[]
}

interface DepositData {
  totalBalance: number
  deposits: Deposit[]
}

const returnSchema = z.object({
  amount: z.number().min(1),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  notes: z.string().optional(),
})
type ReturnInput = z.infer<typeof returnSchema>

const SOURCE_LABELS: Record<string, string> = {
  OVERPAY_TRANSACTION: "Kelebihan bayar POS",
  OVERPAY_PURCHASE: "Kelebihan bayar PO",
  MANUAL: "Deposit manual",
}

interface DepositCardProps {
  partyType: "CUSTOMER" | "VENDOR"
  partyId: string
  refreshKey?: number
}

export function DepositCard({ partyType, partyId, refreshKey }: DepositCardProps) {
  const toast = useToast()
  const [data, setData] = useState<DepositData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [returnTarget, setReturnTarget] = useState<Deposit | null>(null)
  const [isReturning, setIsReturning] = useState(false)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ReturnInput>({
    resolver: zodResolver(returnSchema),
    defaultValues: { amount: 0, paymentMethod: "CASH" },
  })

  const apiPath = partyType === "CUSTOMER"
    ? `/api/customers/${partyId}/deposit`
    : `/api/vendors/${partyId}/deposit`

  async function fetchDeposit() {
    setIsLoading(true)
    fetch(apiPath)
      .then((r) => r.json())
      .then((json) => setData(json.data ?? null))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { fetchDeposit() }, [partyId, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onReturn(formData: ReturnInput) {
    if (!returnTarget) return
    setIsReturning(true)
    try {
      const res = await fetch(`/api/deposits/${returnTarget.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal mengembalikan deposit")
      toast.success("Deposit berhasil dikembalikan")
      setReturnTarget(null)
      reset()
      fetchDeposit()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally { setIsReturning(false) }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Deposit</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.totalBalance === 0) return null

  return (
    <>
      <Card className="border-blue-200 dark:border-blue-900/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-base text-blue-700 dark:text-blue-400">Saldo Deposit</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <CurrencyDisplay
            amount={data.totalBalance}
            className="text-2xl font-bold text-blue-700 dark:text-blue-400"
          />
          <p className="text-xs text-muted-foreground">
            dari {data.deposits.length} deposit aktif
          </p>

          <div className="space-y-2">
            {data.deposits.map((dep) => (
              <div key={dep.id} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                <div>
                  <p className="text-xs font-medium">{SOURCE_LABELS[dep.source] ?? dep.source}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(dep.createdAt), "dd MMM yyyy", { locale: idLocale })}
                    {" · "}Saldo: <CurrencyDisplay amount={Number(dep.balance)} className="text-xs font-semibold" />
                  </p>
                </div>
                <Button
                  variant="outline" size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => { setReturnTarget(dep); reset({ amount: Number(dep.balance), paymentMethod: "CASH" }) }}
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  Kembalikan
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Return Dialog */}
      <Dialog open={!!returnTarget} onOpenChange={(v) => !v && setReturnTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Kembalikan Deposit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onReturn)} className="space-y-4">
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Saldo Deposit</p>
              <CurrencyDisplay amount={Number(returnTarget?.balance ?? 0)} className="text-base font-bold text-blue-700" />
            </div>
            <div className="space-y-2">
              <Label>Nominal Dikembalikan</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input
                  type="number" min={1} max={Number(returnTarget?.balance ?? 0)}
                  className="pl-9 h-11 text-lg font-semibold"
                  {...register("amount", { valueAsNumber: true })}
                  autoFocus
                />
              </div>
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Metode Pengembalian</Label>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReturnTarget(null)} disabled={isReturning}>Batal</Button>
              <Button type="submit" disabled={isReturning}>
                {isReturning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Kembalikan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
