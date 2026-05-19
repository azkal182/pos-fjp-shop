"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { VendorTable } from "@/features/vendors/components/VendorTable"
import { VendorForm } from "@/features/vendors/components/VendorForm"
import { useToast } from "@/hooks/useToast"
import { useDebounce } from "@/hooks/useDebounce"
import type { CreateVendorInput } from "@/features/vendors/schemas"

interface Vendor {
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
  _count: { purchases: number }
}

export default function VendorsPage() {
  const toast = useToast()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [filters, setFilters] = useState({ search: "", isActive: "true" })
  const debouncedSearch = useDebounce(filters.search, 400)

  const fetchVendors = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (filters.isActive) params.set("isActive", filters.isActive)
      const res = await fetch(`/api/vendors?${params}`)
      const json = await res.json()
      setVendors(json.data ?? [])
    } catch {
      toast.error("Gagal memuat vendor")
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, filters.isActive]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchVendors() }, [fetchVendors])

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCreate(data: CreateVendorInput) {
    setIsCreating(true)
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menambah vendor")
      toast.success("Vendor berhasil ditambahkan")
      setIsCreateOpen(false)
      fetchVendors()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <PageWrapper
      title="Vendor"
      actions={
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Vendor
        </Button>
      }
    >
      <VendorTable
        data={vendors}
        isLoading={isLoading}
        filters={filters}
        onFilterChange={setFilter}
        onRefetch={fetchVendors}
      />

      <VendorForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        isLoading={isCreating}
        mode="create"
      />
    </PageWrapper>
  )
}
