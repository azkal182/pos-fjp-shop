"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PurchaseTable } from "@/features/purchases/components/PurchaseTable"
import { useToast } from "@/hooks/useToast"
import type { PaginationMeta } from "@/types"

interface Purchase {
  id: string
  code: string
  vendor: { id: string; name: string }
  totalAmount: number
  purchaseDate: string
  _count: { items: number }
}

interface Vendor {
  id: string
  name: string
}

export default function PurchasesPage() {
  const toast = useToast()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ vendorId: "", dateFrom: undefined as Date | undefined, dateTo: undefined as Date | undefined })

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      if (filters.vendorId) params.set("vendorId", filters.vendorId)
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom.toISOString())
      if (filters.dateTo) params.set("dateTo", filters.dateTo.toISOString())
      const res = await fetch(`/api/purchases?${params}`)
      const json = await res.json()
      setPurchases(json.data ?? [])
      setMeta(json.meta)
    } catch {
      toast.error("Gagal memuat data pembelian")
    } finally {
      setIsLoading(false)
    }
  }, [page, filters]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchPurchases() }, [fetchPurchases])
  useEffect(() => { setPage(1) }, [filters.vendorId, filters.dateFrom, filters.dateTo])

  useEffect(() => {
    fetch("/api/vendors?isActive=true")
      .then((r) => r.json())
      .then((json) => setVendors(json.data ?? []))
      .catch(() => {})
  }, [])

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function setDateRange(range: { from?: Date; to?: Date }) {
    setFilters((prev) => ({ ...prev, dateFrom: range.from, dateTo: range.to }))
  }

  return (
    <PageWrapper
      title="Pembelian"
      actions={
        <Button asChild>
          <Link href="/purchases/new">
            <Plus className="h-4 w-4 mr-2" />
            Pembelian Baru
          </Link>
        </Button>
      }
    >
      <PurchaseTable
        data={purchases}
        meta={meta}
        isLoading={isLoading}
        vendors={vendors}
        filters={filters}
        onFilterChange={setFilter}
        onDateRangeChange={setDateRange}
        onPageChange={setPage}
      />
    </PageWrapper>
  )
}
