"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowDown, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { stockAdjustmentSchema, type StockAdjustmentInput } from "../schemas"

interface Product {
  id: string
  name: string
  code: string
  unit: string
  stock: number
}

interface StockAdjustmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function StockAdjustmentForm({ open, onOpenChange, onSuccess }: StockAdjustmentFormProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StockAdjustmentInput>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: { productId: "", type: "ADJUSTMENT_IN", quantity: 1, notes: "" },
  })

  const selectedType = watch("type")

  // Search produk dengan debounce
  useEffect(() => {
    if (!search.trim()) { setProducts([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&isActive=true&limit=10`)
        const json = await res.json()
        setProducts(json.data ?? [])
      } catch { setProducts([]) }
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  function selectProduct(product: Product) {
    setSelectedProduct(product)
    setValue("productId", product.id)
    setSearch(`${product.name} (${product.code})`)
    setShowDropdown(false)
  }

  function handleClose() {
    reset()
    setSearch("")
    setSelectedProduct(null)
    setApiError(null)
    onOpenChange(false)
  }

  async function onSubmit(data: StockAdjustmentInput) {
    setIsSubmitting(true)
    setApiError(null)
    try {
      const res = await fetch("/api/stock-movements/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan penyesuaian")
      onSuccess()
      handleClose()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Penyesuaian Stok</DialogTitle>
          <DialogDescription>
            Koreksi stok secara manual. Setiap penyesuaian akan tercatat di log pergerakan stok.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipe penyesuaian */}
          <div className="space-y-2">
            <Label>Tipe Penyesuaian</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setValue("type", "ADJUSTMENT_IN")}
                className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                  selectedType === "ADJUSTMENT_IN"
                    ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : "border-border hover:bg-muted"
                }`}
              >
                <ArrowUp className="h-4 w-4" />
                Penambahan
              </button>
              <button
                type="button"
                onClick={() => setValue("type", "ADJUSTMENT_OUT")}
                className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                  selectedType === "ADJUSTMENT_OUT"
                    ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                    : "border-border hover:bg-muted"
                }`}
              >
                <ArrowDown className="h-4 w-4" />
                Pengurangan
              </button>
            </div>
            <input type="hidden" {...register("type")} />
          </div>

          {/* Pilih produk */}
          <div className="space-y-2">
            <Label>Produk</Label>
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowDropdown(true) }}
                onFocus={() => search && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Cari nama atau kode produk..."
                aria-invalid={!!errors.productId}
              />
              {showDropdown && products.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2"
                      onMouseDown={() => selectProduct(p)}
                    >
                      <div>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-mono">{p.code}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        Stok: {p.stock} {p.unit}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <input type="hidden" {...register("productId")} />
            </div>
            {errors.productId && (
              <p className="text-xs text-destructive">{errors.productId.message}</p>
            )}
            {selectedProduct && (
              <p className="text-xs text-muted-foreground">
                Stok saat ini:{" "}
                <span className="font-medium text-foreground">
                  {selectedProduct.stock} {selectedProduct.unit}
                </span>
              </p>
            )}
          </div>

          {/* Qty */}
          <div className="space-y-2">
            <Label htmlFor="adj-qty">
              Jumlah {selectedType === "ADJUSTMENT_IN" ? "Penambahan" : "Pengurangan"}
            </Label>
            <Input
              id="adj-qty"
              type="number"
              min={1}
              placeholder="0"
              {...register("quantity", { valueAsNumber: true })}
              aria-invalid={!!errors.quantity}
            />
            {errors.quantity && (
              <p className="text-xs text-destructive">{errors.quantity.message}</p>
            )}
            {/* Preview stok setelah adjustment */}
            {selectedProduct && watch("quantity") > 0 && (
              <p className="text-xs text-muted-foreground">
                Stok setelah:{" "}
                <span className={`font-medium ${
                  selectedType === "ADJUSTMENT_IN" ? "text-green-600" : "text-red-600"
                }`}>
                  {selectedType === "ADJUSTMENT_IN"
                    ? selectedProduct.stock + (watch("quantity") || 0)
                    : selectedProduct.stock - (watch("quantity") || 0)}{" "}
                  {selectedProduct.unit}
                </span>
              </p>
            )}
          </div>

          {/* Alasan */}
          <div className="space-y-2">
            <Label htmlFor="adj-notes">Alasan Penyesuaian</Label>
            <Textarea
              id="adj-notes"
              placeholder="Contoh: Koreksi stok opname, barang rusak, dll..."
              rows={2}
              {...register("notes")}
              aria-invalid={!!errors.notes}
            />
            {errors.notes && (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            )}
          </div>

          {apiError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-sm text-destructive">{apiError}</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={selectedType === "ADJUSTMENT_OUT" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
              Simpan Penyesuaian
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
