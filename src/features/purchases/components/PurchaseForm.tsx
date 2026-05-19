"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { PurchaseItemRow } from "./PurchaseItemRow"
import { PriceChangeAlert } from "./PriceChangeAlert"
import { createPurchaseSchema, type CreatePurchaseInput, type PriceChange } from "../schemas/purchase.schema"

interface Vendor {
  id: string
  name: string
}

interface PurchaseFormProps {
  onSuccess: () => void
}

export function PurchaseForm({ onSuccess }: PurchaseFormProps) {
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

  useEffect(() => {
    fetch("/api/vendors?isActive=true")
      .then((r) => r.json())
      .then((json) => setVendors(json.data ?? []))
      .catch(() => {})
  }, [])

  async function onSubmit(data: CreatePurchaseInput) {
    // Deteksi perubahan harga dulu
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
        const hasChanges = changes.some((c) => c.changed)

        if (hasChanges) {
          setPriceChanges(changes)
          setPendingData(data)
          setShowPriceAlert(true)
          setIsSubmitting(false)
          return
        }
      }
    } catch {
      // Jika endpoint tidak ada, lanjut tanpa deteksi
    }

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
      // Re-throw agar page bisa handle
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePriceAlertConfirm(confirmedIds: string[]) {
    setShowPriceAlert(false)
    if (pendingData) {
      await submitPurchase(pendingData, confirmedIds)
    }
  }

  function handlePriceAlertSkip() {
    setShowPriceAlert(false)
    if (pendingData) {
      submitPurchase(pendingData, [])
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Informasi Pembelian</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vendor */}
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select onValueChange={(val) => setValue("vendorId", val)}>
                <SelectTrigger aria-invalid={!!errors.vendorId}>
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

            {/* Tanggal */}
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Tanggal Pembelian</Label>
              <Input
                id="purchaseDate"
                type="date"
                {...register("purchaseDate")}
                aria-invalid={!!errors.purchaseDate}
              />
              {errors.purchaseDate && (
                <p className="text-xs text-destructive">{errors.purchaseDate.message}</p>
              )}
            </div>

            {/* Catatan */}
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan <span className="text-muted-foreground">(opsional)</span></Label>
              <Textarea
                id="notes"
                placeholder="Catatan pembelian..."
                rows={1}
                {...register("notes")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Item Pembelian</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: "", quantity: 1, buyPrice: 0 })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Tambah Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Header kolom */}
            <div className="grid grid-cols-[1fr_80px_140px_100px_36px] gap-2 text-xs font-medium text-muted-foreground px-0">
              <span>Produk</span>
              <span className="text-center">Qty</span>
              <span>Harga Beli</span>
              <span className="text-right">Subtotal</span>
              <span />
            </div>

            <Separator />

            {fields.map((field, index) => (
              <PurchaseItemRow
                key={field.id}
                index={index}
                onRemove={() => remove(index)}
              />
            ))}

            {errors.items && typeof errors.items === "object" && "message" in errors.items && (
              <p className="text-xs text-destructive">{(errors.items as any).message}</p>
            )}

            <Separator />

            {/* Total */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium">Total Pembelian</span>
              <CurrencyDisplay amount={totalAmount} className="text-lg font-bold" />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Simpan Pembelian
          </Button>
        </div>
      </form>

      {/* Price Change Alert */}
      <PriceChangeAlert
        open={showPriceAlert}
        changes={priceChanges}
        onConfirm={handlePriceAlertConfirm}
        onSkip={handlePriceAlertSkip}
      />
    </FormProvider>
  )
}
