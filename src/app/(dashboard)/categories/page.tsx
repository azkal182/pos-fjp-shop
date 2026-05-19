"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { CategoryTable } from "@/features/categories/components/CategoryTable"
import { CategoryForm } from "@/features/categories/components/CategoryForm"
import { useToast } from "@/hooks/useToast"
import type { CreateCategoryInput } from "@/features/categories/schemas"

interface Category {
  id: string
  name: string
  _count: { products: number }
}

export default function CategoriesPage() {
  const toast = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/categories")
      const json = await res.json()
      setCategories(json.data ?? [])
    } catch {
      toast.error("Gagal memuat kategori")
    } finally {
      setIsLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  async function handleCreate(data: CreateCategoryInput) {
    setIsCreating(true)
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menambah kategori")
      toast.success("Kategori berhasil ditambahkan")
      setIsCreateOpen(false)
      fetchCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <PageWrapper
      title="Kategori"
      actions={
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Kategori
        </Button>
      }
    >
      <CategoryTable
        data={categories}
        isLoading={isLoading}
        onRefetch={fetchCategories}
      />

      <CategoryForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        isLoading={isCreating}
        mode="create"
      />
    </PageWrapper>
  )
}
