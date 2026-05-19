"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { ProductTable } from "@/features/products/components/ProductTable"
import { ProductForm } from "@/features/products/components/ProductForm"
import { useProducts } from "@/features/products/hooks/useProducts"
import { useToast } from "@/hooks/useToast"
import type { CreateProductInput } from "@/features/products/schemas/product.schema"

interface Category {
  id: string
  name: string
}

export default function ProductsPage() {
  const toast = useToast()
  const { data, meta, isLoading, filters, setFilter, setPage, refetch } = useProducts()
  const [categories, setCategories] = useState<Category[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => setCategories(json.data ?? []))
      .catch(() => {})
  }, [])

  async function handleCreate(formData: CreateProductInput) {
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
    } finally {
      setIsCreating(false)
    }
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
      <ProductTable
        data={data}
        meta={meta}
        isLoading={isLoading}
        categories={categories}
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
