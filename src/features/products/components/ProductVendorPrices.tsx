"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Star, Trash2, Pencil } from "lucide-react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { DataTable, type Column } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useToast } from "@/hooks/useToast"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface VendorPrice {
  id: string
  vendorId: string
  buyPrice: number
  isPreferred: boolean
  lastOrderAt: string | null
  notes: string | null
  vendor: { id: string; name: string; phone: string | null; isActive: boolean }
}

interface Vendor { id: string; name: string }

const formSchema = z.object({
  vendorId: z.string().min(1, "Vendor wajib dipilih"),
  buyPrice: z.number().min(0, "Harga tidak boleh negatif"),
  notes: z.string().optional(),
})
type FormInput = z.infer<typeof formSchema>

interface ProductVendorPricesProps {
  productId: string
}

export function ProductVendorPrices({ productId }: ProductVendorPricesProps) {
  const toast = useToast()
  const [prices, setPrices] = useState<VendorPrice[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<VendorPrice | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VendorPrice | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { vendorId: "", buyPrice: 0, notes: "" },
  })

  async function fetchPrices() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}/vendor-prices`)
      const json = await res.json()
      setPrices(json.data ?? [])
    } catch { toast.error("Gagal memuat data vendor") }
    finally { setIsLoading(false) }
  }

  useEffect(() => {
    fetchPrices()
    fetch("/api/vendors?isActive=true")
      .then((r) => r.json())
      .then((json) => setVendors(json.data ?? []))
      .catch(() => {})
  }, [productId]) // eslint-disable-line react-hooks/exhaustive-deps

  function openAdd() {
    setEditTarget(null)
    reset({ vendorId: "", buyPrice: 0, notes: "" })
    setIsFormOpen(true)
  }

  function openEdit(price: VendorPrice) {
    setEditTarget(price)
    reset({ vendorId: price.vendorId, buyPrice: Number(price.buyPrice), notes: price.notes ?? "" })
    setIsFormOpen(true)
  }

  async function onSubmit(data: FormInput) {
    setIsSubmitting(true)
    try {
      const url = editTarget
        ? `/api/products/${productId}/vendor-prices/${editTarget.vendorId}`
        : `/api/products/${productId}/vendor-prices`
      const method = editTarget ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan")
      toast.success(editTarget ? "Harga vendor diupdate" : "Vendor ditambahkan")
      setIsFormOpen(false)
      fetchPrices()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally { setIsSubmitting(false) }
  }

  async function handleSetPreferred(price: VendorPrice) {
    try {
      await fetch(`/api/products/${productId}/vendor-prices/${price.vendorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPreferred: true }),
      })
      toast.success(`${price.vendor.name} dijadikan vendor utama`)
      fetchPrices()
    } catch { toast.error("Gagal mengubah vendor utama") }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/products/${productId}/vendor-prices/${deleteTarget.vendorId}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menghapus")
      toast.success("Relasi vendor dihapus")
      setDeleteTarget(null)
      fetchPrices()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally { setIsDeleting(false) }
  }

  const columns: Column<VendorPrice>[] = [
    {
      header: "Vendor",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.isPreferred && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />}
          <div>
            <p className="font-medium text-sm">{row.vendor.name}</p>
            {row.vendor.phone && <p className="text-xs text-muted-foreground">{row.vendor.phone}</p>}
          </div>
        </div>
      ),
    },
    {
      header: "Harga Beli",
      render: (row) => <CurrencyDisplay amount={Number(row.buyPrice)} className="font-semibold" />,
    },
    {
      header: "Terakhir Order",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.lastOrderAt ? format(new Date(row.lastOrderAt), "dd MMM yyyy", { locale: idLocale }) : "—"}
        </span>
      ),
    },
    {
      header: "Catatan",
      render: (row) => <span className="text-xs text-muted-foreground">{row.notes ?? "—"}</span>,
    },
    {
      header: "Aksi",
      className: "w-[130px] text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {!row.isPreferred && (
            <Button
              variant="ghost" size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-yellow-600"
              onClick={() => handleSetPreferred(row)}
              title="Jadikan vendor utama"
            >
              <Star className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  // Filter vendor yang belum ada di list
  const existingVendorIds = new Set(prices.map((p) => p.vendorId))
  const availableVendors = editTarget
    ? vendors
    : vendors.filter((v) => !existingVendorIds.has(v.id))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openAdd} disabled={availableVendors.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Vendor
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={prices}
        isLoading={isLoading}
        emptyMessage="Belum ada vendor untuk produk ini"
        emptyDescription="Tambah vendor untuk mencatat harga beli dari berbagai sumber"
        keyExtractor={(row) => row.vendorId}
      />

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(v) => !v && setIsFormOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Harga Vendor" : "Tambah Vendor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              {editTarget ? (
                <p className="text-sm font-medium">{editTarget.vendor.name}</p>
              ) : (
                <Select onValueChange={(v) => setValue("vendorId", v)}>
                  <SelectTrigger aria-invalid={!!errors.vendorId}>
                    <SelectValue placeholder="Pilih vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.vendorId && <p className="text-xs text-destructive">{errors.vendorId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Harga Beli dari Vendor Ini</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  className="pl-9"
                  {...register("buyPrice", { valueAsNumber: true })}
                  aria-invalid={!!errors.buyPrice}
                />
              </div>
              {errors.buyPrice && <p className="text-xs text-destructive">{errors.buyPrice.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Catatan <span className="text-muted-foreground">(opsional)</span></Label>
              <Input placeholder="Min order, syarat, dll..." {...register("notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
                {editTarget ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Hapus Relasi Vendor"
        description={`Yakin ingin menghapus vendor "${deleteTarget?.vendor.name}" dari produk ini?`}
        confirmLabel="Hapus"
        isLoading={isDeleting}
      />
    </div>
  )
}
