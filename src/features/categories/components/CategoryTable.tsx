"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { CategoryForm } from "./CategoryForm"
import { useToast } from "@/hooks/useToast"
import type { CreateCategoryInput } from "../schemas"

interface Category {
  id: string
  name: string
  _count: { products: number }
}

interface CategoryTableProps {
  data: Category[]
  isLoading?: boolean
  onRefetch: () => void
}

export function CategoryTable({ data, isLoading, onRefetch }: CategoryTableProps) {
  const toast = useToast()
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleEdit(formData: CreateCategoryInput) {
    if (!editTarget) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/categories/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal mengupdate kategori")
      toast.success("Kategori berhasil diupdate")
      setEditTarget(null)
      onRefetch()
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
      const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menghapus kategori")
      toast.success("Kategori berhasil dihapus")
      setDeleteTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: Column<Category>[] = [
    {
      header: "Nama Kategori",
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      header: "Jumlah Produk",
      render: (row) => (
        <span className="text-muted-foreground">{row._count.products} produk</span>
      ),
    },
    {
      header: "Aksi",
      className: "w-[120px] text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setEditTarget(row)}
            aria-label="Edit kategori"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row)}
            aria-label="Hapus kategori"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="Belum ada kategori"
        emptyDescription="Tambah kategori pertama untuk mulai mengelola produk"
        keyExtractor={(row) => row.id}
      />

      {/* Edit Dialog */}
      <CategoryForm
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        defaultValues={editTarget ? { name: editTarget.name } : undefined}
        onSubmit={handleEdit}
        isLoading={isSubmitting}
        mode="edit"
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Hapus Kategori"
        description={`Yakin ingin menghapus kategori "${deleteTarget?.name}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        isLoading={isDeleting}
      />
    </>
  )
}
