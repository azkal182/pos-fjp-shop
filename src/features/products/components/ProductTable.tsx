"use client"

import { useState } from "react"
import { Pencil, PowerOff, Eye } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { SearchInput } from "@/components/shared/SearchInput"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { Pagination } from "@/components/shared/Pagination"
import { StockBadge } from "./StockBadge"
import { ProductForm } from "./ProductForm"
import { useToast } from "@/hooks/useToast"
import type { PaginationMeta } from "@/types"
import type { ProductWithCategory } from "../types/product.types"
import type { CreateProductInput, EditProductInput } from "../schemas/product.schema"

interface Category {
  id: string
  name: string
}

interface Vendor {
  id: string
  name: string
}

interface ProductTableProps {
  data: ProductWithCategory[]
  meta: PaginationMeta
  isLoading?: boolean
  categories: Category[]
  vendors?: Vendor[]
  filters: {
    search: string
    categoryId: string
    isActive: string
    vendorId?: string
    lowStock?: string
  }
  onFilterChange: (key: string, value: string) => void
  onPageChange: (page: number) => void
  onRefetch: () => void
}

export function ProductTable({
  data,
  meta,
  isLoading,
  categories,
  vendors = [],
  filters,
  onFilterChange,
  onPageChange,
  onRefetch,
}: ProductTableProps) {
  const toast = useToast()
  const [editTarget, setEditTarget] = useState<ProductWithCategory | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<ProductWithCategory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  async function handleEdit(formData: CreateProductInput | EditProductInput) {
    if (!editTarget) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/products/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal mengupdate produk")
      toast.success("Produk berhasil diupdate")
      setEditTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return
    setIsDeactivating(true)
    try {
      const res = await fetch(`/api/products/${deactivateTarget.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menonaktifkan produk")
      toast.success("Produk berhasil dinonaktifkan")
      setDeactivateTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsDeactivating(false)
    }
  }

  const columns: Column<ProductWithCategory>[] = [
    {
      header: "Kode",
      render: (row) => (
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</span>
      ),
    },
    {
      header: "Nama Produk",
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.category.name} · {row.unit}</p>
        </div>
      ),
    },
    {
      header: "Harga Beli",
      render: (row) => <CurrencyDisplay amount={Number(row.buyPrice)} />,
    },
    {
      header: "Harga Jual",
      render: (row) => <CurrencyDisplay amount={Number(row.sellPrice)} />,
    },
    {
      header: "Stok",
      render: (row) => <StockBadge stock={row.stock} minStock={row.minStock} />,
    },
    {
      header: "Status",
      render: (row) => (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          row.isActive
            ? "bg-green-100 text-green-800 border-green-200"
            : "bg-gray-100 text-gray-600 border-gray-200"
        }`}>
          {row.isActive ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    {
      header: "Aksi",
      className: "w-[120px] text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={`/products/${row.id}`} aria-label="Detail produk">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setEditTarget(row)}
            aria-label="Edit produk"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {row.isActive && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeactivateTarget(row)}
              aria-label="Nonaktifkan produk"
            >
              <PowerOff className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={filters.search}
          onChange={(v) => onFilterChange("search", v)}
          placeholder="Cari nama atau kode..."
          className="w-64"
        />
        <Select
          value={filters.categoryId || "all"}
          onValueChange={(v) => onFilterChange("categoryId", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {vendors.length > 0 && (
          <Select
            value={filters.vendorId || "all"}
            onValueChange={(v) => onFilterChange("vendorId", v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Semua Vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Vendor</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={filters.isActive || "all"}
          onValueChange={(v) => onFilterChange("isActive", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="true">Aktif</SelectItem>
            <SelectItem value="false">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.lowStock === "true" ? "true" : "all"}
          onValueChange={(v) => onFilterChange("lowStock", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua Stok" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Stok</SelectItem>
            <SelectItem value="true">Stok Rendah</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="Belum ada produk"
        emptyDescription="Tambah produk pertama untuk mulai berjualan"
        keyExtractor={(row) => row.id}
      />

      <Pagination meta={meta} onPageChange={onPageChange} />

      {/* Edit Dialog */}
      <ProductForm
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        defaultValues={
          editTarget
            ? {
                code: editTarget.code,
                name: editTarget.name,
                categoryId: editTarget.categoryId,
                unit: editTarget.unit,
                buyPrice: Number(editTarget.buyPrice),
                sellPrice: Number(editTarget.sellPrice),
                minStock: editTarget.minStock,
                isActive: editTarget.isActive,
              }
            : undefined
        }
        onSubmit={handleEdit}
        isLoading={isSubmitting}
        mode="edit"
      />

      {/* Deactivate Confirm */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
        title="Nonaktifkan Produk"
        description={`Yakin ingin menonaktifkan "${deactivateTarget?.name}"? Produk tidak akan muncul di POS.`}
        confirmLabel="Nonaktifkan"
        isLoading={isDeactivating}
      />
    </div>
  )
}
