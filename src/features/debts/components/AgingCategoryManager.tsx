"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Pencil, Trash2 } from "lucide-react"
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
import { DataTable, type Column } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useToast } from "@/hooks/useToast"
import { createAgingCategorySchema, type CreateAgingCategoryInput } from "../schemas/debt.schema"

interface AgingCategory {
  id: string
  name: string
  minDays: number
  maxDays: number | null
  color: string
  order: number
}

export function AgingCategoryManager() {
  const toast = useToast()
  const [categories, setCategories] = useState<AgingCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AgingCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AgingCategory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAgingCategoryInput>({
    resolver: zodResolver(createAgingCategorySchema),
    defaultValues: { name: "", minDays: 0, maxDays: null, color: "#6b7280", order: 1 },
  })

  async function fetchCategories() {
    setIsLoading(true)
    try {
      const res = await fetch("/api/debt-aging-categories")
      const json = await res.json()
      setCategories(json.data ?? [])
    } catch { toast.error("Gagal memuat kategori aging") }
    finally { setIsLoading(false) }
  }

  useEffect(() => { fetchCategories() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditTarget(null)
    reset({ name: "", minDays: 0, maxDays: null, color: "#6b7280", order: (categories.length + 1) })
    setIsFormOpen(true)
  }

  function openEdit(cat: AgingCategory) {
    setEditTarget(cat)
    reset({ name: cat.name, minDays: cat.minDays, maxDays: cat.maxDays, color: cat.color, order: cat.order })
    setIsFormOpen(true)
  }

  async function onSubmit(data: CreateAgingCategoryInput) {
    setIsSubmitting(true)
    try {
      const url = editTarget ? `/api/debt-aging-categories/${editTarget.id}` : "/api/debt-aging-categories"
      const method = editTarget ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan")
      toast.success(editTarget ? "Kategori diupdate" : "Kategori ditambahkan")
      setIsFormOpen(false)
      fetchCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/debt-aging-categories/${deleteTarget.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menghapus")
      toast.success("Kategori dihapus")
      setDeleteTarget(null)
      fetchCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: Column<AgingCategory>[] = [
    {
      header: "Nama",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full shrink-0 border"
            style={{ backgroundColor: row.color, borderColor: row.color }}
          />
          <span className="font-medium text-sm">{row.name}</span>
        </div>
      ),
    },
    {
      header: "Rentang Hari",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.minDays} – {row.maxDays ?? "∞"} hari
        </span>
      ),
    },
    {
      header: "Warna",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.color}</span>
      ),
    },
    {
      header: "Urutan",
      render: (row) => <span className="text-sm text-muted-foreground">{row.order}</span>,
    },
    {
      header: "Aksi",
      className: "w-[100px] text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Kategori
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={categories}
        isLoading={isLoading}
        emptyMessage="Belum ada kategori aging"
        keyExtractor={(row) => row.id}
      />

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(v) => !v && setIsFormOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input placeholder="Lancar, Perhatian, Kritis..." {...register("name")} aria-invalid={!!errors.name} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min Hari</Label>
                <Input type="number" min={0} {...register("minDays", { valueAsNumber: true })} />
                {errors.minDays && <p className="text-xs text-destructive">{errors.minDays.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Max Hari <span className="text-muted-foreground text-xs">(kosong = ∞)</span></Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="∞"
                  {...register("maxDays", {
                    setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                  })}
                />
                {errors.maxDays && <p className="text-xs text-destructive">{errors.maxDays.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Warna (Hex)</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    className="h-9 w-12 p-1 cursor-pointer"
                    {...register("color")}
                  />
                  <Input
                    placeholder="#6b7280"
                    className="flex-1 font-mono text-sm"
                    {...register("color")}
                    aria-invalid={!!errors.color}
                  />
                </div>
                {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Urutan</Label>
                <Input type="number" min={1} {...register("order", { valueAsNumber: true })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
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
        title="Hapus Kategori Aging"
        description={`Yakin ingin menghapus kategori "${deleteTarget?.name}"?`}
        confirmLabel="Hapus"
        isLoading={isDeleting}
      />
    </div>
  )
}
