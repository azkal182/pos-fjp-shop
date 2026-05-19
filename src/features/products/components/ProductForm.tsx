"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Info } from "lucide-react"
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
import { createProductSchema, type CreateProductInput } from "../schemas/product.schema"

interface Category {
  id: string
  name: string
}

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: Partial<CreateProductInput>
  onSubmit: (data: CreateProductInput) => Promise<void>
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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      code: "",
      name: "",
      categoryId: "",
      unit: "",
      buyPrice: 0,
      sellPrice: 0,
      minStock: 0,
      isActive: true,
      ...defaultValues,
    },
    values: defaultValues as CreateProductInput | undefined,
  })

  const isActive = watch("isActive")

  useEffect(() => {
    if (open) {
      fetch("/api/categories")
        .then((r) => r.json())
        .then((json) => setCategories(json.data ?? []))
        .catch(() => {})
    }
  }, [open])

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  async function handleFormSubmit(data: CreateProductInput) {
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
          {/* Kode & Nama */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode / SKU</Label>
              <Input id="code" placeholder="PRD-001" {...register("code")} aria-invalid={!!errors.code} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Satuan</Label>
              <Input id="unit" placeholder="pcs, kg, box..." {...register("unit")} aria-invalid={!!errors.unit} />
              {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nama Produk</Label>
            <Input id="name" placeholder="Nama produk..." {...register("name")} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Kategori */}
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
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p className="text-xs text-destructive">{errors.categoryId.message}</p>
            )}
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
            <span>Stok dikelola otomatis melalui Pembelian & Penyesuaian Stok</span>
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
