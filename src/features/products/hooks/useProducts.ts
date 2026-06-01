"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useDebounce } from "@/hooks/useDebounce"
import type { ProductWithCategory } from "../types/product.types"
import type { PaginationMeta } from "@/types"

interface Filters {
  search: string
  categoryId: string
  isActive: string
  vendorId: string
  lowStock: string
}

export function useProducts() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [data, setData] = useState<ProductWithCategory[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filters = useMemo<Filters>(() => ({
    search: searchParams.get("search") ?? "",
    categoryId: searchParams.get("categoryId") ?? "",
    isActive: searchParams.get("isActive") ?? "true",
    vendorId: searchParams.get("vendorId") ?? "",
    lowStock: searchParams.get("lowStock") === "true" ? "true" : "",
  }), [searchParams])

  const page = useMemo(() => {
    const pageParam = Number(searchParams.get("page") ?? "1")
    return Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
  }, [searchParams])

  const debouncedSearch = useDebounce(filters.search, 400)

  const buildQuery = useCallback((nextFilters: Filters, nextPage: number) => {
    const params = new URLSearchParams()
    if (nextFilters.search) params.set("search", nextFilters.search)
    if (nextFilters.categoryId) params.set("categoryId", nextFilters.categoryId)
    if (nextFilters.vendorId) params.set("vendorId", nextFilters.vendorId)
    if (nextFilters.isActive) params.set("isActive", nextFilters.isActive)
    if (nextFilters.lowStock) params.set("lowStock", nextFilters.lowStock)
    if (nextPage > 1) params.set("page", String(nextPage))
    return params.toString()
  }, [])

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
      if (filters.vendorId) params.set("vendorId", filters.vendorId)
      if (filters.lowStock) params.set("lowStock", filters.lowStock)

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
  }, [debouncedSearch, filters.categoryId, filters.isActive, filters.vendorId, filters.lowStock, page])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const setFilter = useCallback((key: string, value: string) => {
    const nextFilters = { ...filters, [key]: value }
    const nextQuery = buildQuery(nextFilters, 1)
    const currentQuery = searchParams.toString()
    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    }
  }, [buildQuery, filters, pathname, router, searchParams])

  const setPageWithUrl = useCallback((nextPage: number) => {
    if (page === nextPage) return
    const nextQuery = buildQuery(filters, nextPage)
    const currentQuery = searchParams.toString()
    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    }
  }, [buildQuery, filters, page, pathname, router, searchParams])

  return {
    data,
    meta,
    isLoading,
    error,
    filters,
    page,
    setFilter,
    setPage: setPageWithUrl,
    refetch: fetchProducts,
  }
}
