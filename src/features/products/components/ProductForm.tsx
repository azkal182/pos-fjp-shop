"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Info, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { createProductSchema, editProductSchema, type CreateProductInput, type EditProductInput } from "../schemas/product.schema"

interface Category { id: string; name: string }
interface Vendor { id: string; name: string }

const UNIT_OPTIONS = [
  "pcs", "kg", "gram", "liter", "ml", "box", "karton",
  "lusin", "pak", "botol", "kaleng", "sachet", "lembar", "meter", "roll",
]

function generateSKU(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  // Pakai 4 karakter random + 4 karakter dari timestamp (base36) untuk uniqueness
  const random = Array.from({ length: 4 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("")
  const ts = Date.now().toString(36).toUpperCase().slice(-4)
  return `SKU-${ts}${random}`
}

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: Partial<CreateProductInput>
  onSubmit: (data: CreateProductInput | EditProductInput) => Promise<void>
  isLoading?: boolean
  mode?: "create" | "edit"
}

export function ProductForm({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  isLoading = false,
  mode = "create",
}: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateProductInput | EditProductInput>({
    resolver: zodResolver(mode === "create" ? createProductSchema : editProductSchema),
    defaultValues: {
      code: mode === "create" ? generateSKU() : "",
      name: "",
      categoryId: "",
      ...(mode === "create" ? { vendorId: "" } : {}),
      unit: "",
      buyPrice: 0,
      sellPrice: 0,
      minStock: 0,
      isActive: true,
      ...defaultValues,
    },
    values: defaultValues as (CreateProductInput | EditProductInput) | undefined,
  })

  const isActive = watch("isActive")

  useEffect(() => {
    if (open) {
      if (mode === "create") setValue("code", generateSKU())
      fetch("/api/categories")
        .then((r) => r.json())
        .then((json) => setCategories(json.data ?? []))
        .catch(() => {})
      fetch("/api/vendors?isActive=true&limit=100")
        .then((r) => r.json())
        .then((json) => setVendors(json.data ?? []))
        .catch(() => {})
    }
  }, [open, mode, setValue])

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  async function handleFormSubmit(data: CreateProductInput | EditProductInput) {
    await onSubmit(data)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tambah Produk" : "Edit Produk"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Kode SKU */}
          <div className="space-y-2">
            <Label htmlFor="code">Kode / SKU</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                placeholder="SKU-XXXXXX"
                {...register("code")}
                aria-invalid={!!errors.code}
                className="font-mono"
              />
              {mode === "create" && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setValue("code", generateSKU())}
                  title="Generate ulang SKU"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>

          {/* Nama Produk */}
          <div className="space-y-2">
            <Label htmlFor="name">Nama Produk</Label>
            <Input
              id="name"
              placeholder="Nama produk..."
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Vendor — wajib saat create */}
          {mode === "create" && (
            <div className="space-y-2">
              <Label>
                Vendor <span className="text-destructive">*</span>
              </Label>
              <Select
                defaultValue={defaultValues?.vendorId}
                onValueChange={(val) => setValue("vendorId" as any, val)}
              >
                <SelectTrigger aria-invalid={!!(errors as any).vendorId}>
                  <SelectValue placeholder="Pilih vendor utama produk..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(errors as any).vendorId && (
                <p className="text-xs text-destructive">{(errors as any).vendorId.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Vendor utama produk ini. Harga beli dari vendor lain bisa ditambah di halaman detail produk.
              </p>
            </div>
          )}

          {/* Kategori & Satuan */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select
                defaultValue={defaultValues?.categoryId}
                onValueChange={(val) => setValue("categoryId", val)}
              >
                <SelectTrigger aria-invalid={!!errors.categoryId}>
                  <SelectValue placeholder="Pilih kategori..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-xs text-destructive">{errors.categoryId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Satuan</Label>
              <Select
                defaultValue={defaultValues?.unit}
                onValueChange={(val) => setValue("unit", val)}
              >
                <SelectTrigger aria-invalid={!!errors.unit}>
                  <SelectValue placeholder="Pilih satuan..." />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unit && (
                <p className="text-xs text-destructive">{errors.unit.message}</p>
              )}
            </div>
          </div>

          {/* Harga */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buyPrice">Harga Beli (HPP)</Label>
              <Input
                id="buyPrice"
                type="number"
                min={0}
                placeholder="0"
                {...register("buyPrice", { valueAsNumber: true })}
                aria-invalid={!!errors.buyPrice}
              />
              {errors.buyPrice && <p className="text-xs text-destructive">{errors.buyPrice.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellPrice">Harga Jual</Label>
              <Input
                id="sellPrice"
                type="number"
                min={0}
                placeholder="0"
                {...register("sellPrice", { valueAsNumber: true })}
                aria-invalid={!!errors.sellPrice}
              />
              {errors.sellPrice && <p className="text-xs text-destructive">{errors.sellPrice.message}</p>}
            </div>
          </div>

          {/* Min Stok */}
          <div className="space-y-2">
            <Label htmlFor="minStock">Minimum Stok (Alert)</Label>
            <Input
              id="minStock"
              type="number"
              min={0}
              placeholder="0"
              {...register("minStock", { valueAsNumber: true })}
              aria-invalid={!!errors.minStock}
            />
            {errors.minStock && <p className="text-xs text-destructive">{errors.minStock.message}</p>}
          </div>

          {/* Stok info */}
          <div className="flex items-start gap-2 rounded-md bg-muted/50 border px-3 py-2.5 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Stok dikelola otomatis melalui Pembelian &amp; Penyesuaian Stok</span>
          </div>

          {/* Status Aktif */}
          {mode === "edit" && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Status Aktif</p>
                <p className="text-xs text-muted-foreground">Produk nonaktif tidak muncul di POS</p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(val) => setValue("isActive", val)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
              {mode === "create" ? "Tambah Produk" : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
