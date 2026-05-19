"use client"

import { useState, useEffect, useCallback } from "react"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { StockMovementTable } from "@/features/stock-movements/components/StockMovementTable"
import { StockAdjustmentForm } from "@/features/stock-movements/components/StockAdjustmentForm"
import { useDebounce } from "@/hooks/useDebounce"
import { useToast } from "@/hooks/useToast"
import type { PaginationMeta } from "@/types"

interface StockMovement {
  id: string
  type: string
  quantity: number
  stockBefore: number
  stockAfter: number
  referenceCode: string | null
  createdAt: string
  product: { id: string; name: string; code: string; unit: string }
}

export default function StockMovementsPage() {
  const toast = useToast()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  })
  const debouncedSearch = useDebounce(filters.search, 400)

  const fetchMovements = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "20")
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (filters.type) params.set("type", filters.type)
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom.toISOString())
      if (filters.dateTo) params.set("dateTo", filters.dateTo.toISOString())
      const res = await fetch(`/api/stock-movements?${params}`)
      const json = await res.json()
      setMovements(json.data ?? [])
      setMeta(json.meta)
    } catch {
      toast.error("Gagal memuat pergerakan stok")
    } finally {
      setIsLoading(false)
    }
  }, [page, debouncedSearch, filters.type, filters.dateFrom, filters.dateTo]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchMovements() }, [fetchMovements])
  useEffect(() => { setPage(1) }, [debouncedSearch, filters.type, filters.dateFrom, filters.dateTo])

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function setDateRange(range: { from?: Date; to?: Date }) {
    setFilters((prev) => ({ ...prev, dateFrom: range.from, dateTo: range.to }))
  }

  function handleAdjustSuccess() {
    toast.success("Penyesuaian stok berhasil disimpan")
    fetchMovements()
  }

  return (
    <PageWrapper
      title="Pergerakan Stok"
      actions={
        <Button onClick={() => setIsAdjustOpen(true)} variant="outline">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Penyesuaian Stok
        </Button>
      }
    >
      <StockMovementTable
        data={movements}
        meta={meta}
        isLoading={isLoading}
        filters={filters}
        onFilterChange={setFilter}
        onDateRangeChange={setDateRange}
        onPageChange={setPage}
      />

      <StockAdjustmentForm
        open={isAdjustOpen}
        onOpenChange={setIsAdjustOpen}
        onSuccess={handleAdjustSuccess}
      />
    </PageWrapper>
  )
}
