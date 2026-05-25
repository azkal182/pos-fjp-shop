"use client"

import { useState, useEffect } from "react"
import { Plus, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { ProductTable } from "@/features/products/components/ProductTable"
import { ProductForm } from "@/features/products/components/ProductForm"
import { useProducts } from "@/features/products/hooks/useProducts"
import { useToast } from "@/hooks/useToast"
import type { CreateProductInput, EditProductInput } from "@/features/products/schemas/product.schema"

interface Category { id: string; name: string }

export default function ProductsPage() {
  const toast = useToast()
  const { data, meta, isLoading, filters, setFilter, setPage, refetch } = useProducts()
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [lowStockCount, setLowStockCount] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()).then((j) => setCategories(j.data ?? [])),
      fetch("/api/vendors?isActive=true").then((r) => r.json()).then((j) => setVendors(j.data ?? [])),
      fetch("/api/products?lowStock=true&limit=1").then((r) => r.json()).then((j) => setLowStockCount(j.meta?.total ?? 0)),
    ]).catch(() => {})
  }, [])

  async function handleCreate(formData: CreateProductInput | EditProductInput) {
    setIsCreating(true)
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menambah produk")
      toast.success("Produk berhasil ditambahkan")
      setIsCreateOpen(false)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally { setIsCreating(false) }
  }

  return (
    <PageWrapper
      title="Produk"
      actions={
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Produk
        </Button>
      }
    >
      {/* Low stock alert banner */}
      {lowStockCount > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 px-4 py-3">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              {lowStockCount} produk memiliki stok di bawah minimum
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-400"
            onClick={() => setFilter("isActive", "true")}
          >
            Lihat Stok Rendah
          </Button>
        </div>
      )}

      <ProductTable
        data={data}
        meta={meta}
        isLoading={isLoading}
        categories={categories}
        vendors={vendors}
        filters={filters}
        onFilterChange={setFilter}
        onPageChange={setPage}
        onRefetch={refetch}
      />

      <ProductForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        isLoading={isCreating}
        mode="create"
      />
    </PageWrapper>
  )
}
