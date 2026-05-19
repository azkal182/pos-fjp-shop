"use client"

import { useState, useEffect, useCallback } from "react"
import { useDebounce } from "@/hooks/useDebounce"
import type { ProductWithCategory } from "../types/product.types"
import type { PaginationMeta } from "@/types"

interface Filters {
  search: string
  categoryId: string
  isActive: string
}

export function useProducts() {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    categoryId: "",
    isActive: "true",
  })
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ProductWithCategory[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const debouncedSearch = useDebounce(filters.search, 400)

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "20")
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (filters.categoryId) params.set("categoryId", filters.categoryId)
      if (filters.isActive) params.set("isActive", filters.isActive)

      const res = await fetch(`/api/products?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat produk")
      setData(json.data ?? [])
      setMeta(json.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, filters.categoryId, filters.isActive, page])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Reset ke page 1 saat filter berubah
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, filters.categoryId, filters.isActive])

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return {
    data,
    meta,
    isLoading,
    error,
    filters,
    page,
    setFilter,
    setPage,
    refetch: fetchProducts,
  }
}
