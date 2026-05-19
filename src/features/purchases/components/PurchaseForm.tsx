"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Loader2, PackagePlus, Truck, CalendarDays, FileText, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { PurchaseItemRow } from "./PurchaseItemRow"
import { PriceChangeAlert } from "./PriceChangeAlert"
import { createPurchaseSchema, type CreatePurchaseInput, type PriceChange } from "../schemas/purchase.schema"
import { useToast } from "@/hooks/useToast"

interface Vendor { id: string; name: string }

interface PurchaseFormProps {
  onSuccess: () => void
}

export function PurchaseForm({ onSuccess }: PurchaseFormProps) {
  const toast = useToast()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([])
  const [pendingData, setPendingData] = useState<CreatePurchaseInput | null>(null)
  const [showPriceAlert, setShowPriceAlert] = useState(false)

  const methods = useForm<CreatePurchaseInput>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: {
      vendorId: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      items: [{ productId: "", quantity: 1, buyPrice: 0 }],
      notes: "",
      confirmedPriceUpdates: [],
    },
  })

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = methods
  const { fields, append, remove } = useFieldArray({ control, name: "items" })

  const items = watch("items")
  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.buyPrice) || 0),
    0
  )
  const totalItems = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)

  useEffect(() => {
    fetch("/api/vendors?isActive=true")
      .then((r) => r.json())
      .then((json) => setVendors(json.data ?? []))
      .catch(() => {})
  }, [])

  async function onSubmit(data: CreatePurchaseInput) {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/purchases/detect-price-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: data.items }),
      })
      if (res.ok) {
        const json = await res.json()
        const changes: PriceChange[] = json.data ?? []
        if (changes.some((c) => c.changed)) {
          setPriceChanges(changes)
          setPendingData(data)
          setShowPriceAlert(true)
          setIsSubmitting(false)
          return
        }
      }
    } catch {}
    await submitPurchase(data, [])
  }

  async function submitPurchase(data: CreatePurchaseInput, confirmedPriceUpdates: string[]) {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, confirmedPriceUpdates }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan pembelian")
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Kolom kiri: Info pembelian ── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Vendor */}
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Vendor</h3>
              </div>
              <div className="space-y-2">
                <Label>Pilih Vendor</Label>
                <Select onValueChange={(val) => setValue("vendorId", val)}>
                  <SelectTrigger aria-invalid={!!errors.vendorId} className="w-full">
                    <SelectValue placeholder="Pilih vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vendorId && (
                  <p className="text-xs text-destructive">{errors.vendorId.message}</p>
                )}
              </div>
            </div>

            {/* Tanggal */}
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Tanggal Pembelian</h3>
              </div>
              <div className="space-y-2">
                <Input
                  type="date"
                  {...register("purchaseDate")}
                  aria-invalid={!!errors.purchaseDate}
                />
                {errors.purchaseDate && (
                  <p className="text-xs text-destructive">{errors.purchaseDate.message}</p>
                )}
              </div>
            </div>

            {/* Catatan */}
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Catatan</h3>
              </div>
              <Textarea
                placeholder="Catatan pembelian (opsional)..."
                rows={3}
                {...register("notes")}
                className="resize-none"
              />
            </div>

            {/* Summary card — sticky di desktop */}
            <div className="rounded-lg border bg-card p-4 space-y-3 lg:sticky lg:top-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Ringkasan</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jumlah Jenis</span>
                  <span className="font-medium">{fields.length} produk</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Qty</span>
                  <span className="font-medium">{totalItems} item</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total</span>
                  <CurrencyDisplay amount={totalAmount} className="text-lg font-bold" />
                </div>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full h-10 gap-2">
                {isSubmitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</>
                  : <><PackagePlus className="h-4 w-4" /> Simpan Pembelian</>
                }
              </Button>
            </div>
          </div>

          {/* ── Kolom kanan: Item pembelian ── */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-card overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <PackagePlus className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Item Pembelian</h3>
                  {fields.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{fields.length}</Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => append({ productId: "", quantity: 1, buyPrice: 0 })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Item
                </Button>
              </div>

              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-[1fr_72px_130px_90px_36px] gap-2 px-4 py-2 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b">
                <span>Produk</span>
                <span className="text-center">Qty</span>
                <span>Harga Beli</span>
                <span className="text-right">Subtotal</span>
                <span />
              </div>

              {/* Items */}
              <div className="divide-y">
                {fields.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <PackagePlus className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Belum ada item</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Klik "Tambah Item" untuk mulai</p>
                  </div>
                ) : (
                  fields.map((field, index) => (
                    <div key={field.id} className="px-4 py-3">
                      {/* Mobile: label row number */}
                      <div className="flex items-center justify-between mb-2 sm:hidden">
                        <span className="text-xs font-semibold text-muted-foreground">Item #{index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-destructive hover:text-destructive px-2"
                          onClick={() => remove(index)}
                        >
                          Hapus
                        </Button>
                      </div>
                      <PurchaseItemRow index={index} onRemove={() => remove(index)} />
                    </div>
                  ))
                )}
              </div>

              {/* Footer total */}
              {fields.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {fields.length} item · {totalItems} qty
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Total:</span>
                    <CurrencyDisplay amount={totalAmount} className="text-base font-bold" />
                  </div>
                </div>
              )}

              {errors.items && typeof errors.items === "object" && "message" in errors.items && (
                <p className="text-xs text-destructive px-4 pb-3">{(errors.items as any).message}</p>
              )}
            </div>
          </div>
        </div>
      </form>

      <PriceChangeAlert
        open={showPriceAlert}
        changes={priceChanges}
        onConfirm={(ids) => { setShowPriceAlert(false); pendingData && submitPurchase(pendingData, ids) }}
        onSkip={() => { setShowPriceAlert(false); pendingData && submitPurchase(pendingData, []) }}
      />
    </FormProvider>
  )
}
