"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { CustomerTable } from "@/features/customers/components/CustomerTable"
import { CustomerForm } from "@/features/customers/components/CustomerForm"
import { useToast } from "@/hooks/useToast"
import { useDebounce } from "@/hooks/useDebounce"
import type { PaginationMeta } from "@/types"
import type { CreateCustomerInput } from "@/features/customers/schemas/customer.schema"

interface Customer {
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
  totalOutstanding: number
}

export default function CustomersPage() {
  const toast = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [filters, setFilters] = useState({ search: "", isActive: "true" })
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(filters.search, 400)

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (filters.isActive) params.set("isActive", filters.isActive)
      const res = await fetch(`/api/customers?${params}`)
      const json = await res.json()
      setCustomers(json.data ?? [])
      setMeta(json.meta)
    } catch {
      toast.error("Gagal memuat customer")
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, filters.isActive, page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  // Reset page saat filter berubah
  useEffect(() => { setPage(1) }, [debouncedSearch, filters.isActive])

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCreate(data: CreateCustomerInput) {
    setIsCreating(true)
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menambah customer")
      toast.success("Customer berhasil ditambahkan")
      setIsCreateOpen(false)
      fetchCustomers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <PageWrapper
      title="Customer"
      actions={
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Customer
        </Button>
      }
    >
      <CustomerTable
        data={customers}
        meta={meta}
        isLoading={isLoading}
        filters={filters}
        onFilterChange={setFilter}
        onPageChange={setPage}
        onRefetch={fetchCustomers}
      />

      <CustomerForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        isLoading={isCreating}
        mode="create"
      />
    </PageWrapper>
  )
}
