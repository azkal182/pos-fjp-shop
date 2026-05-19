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
import { CustomerForm } from "./CustomerForm"
import { useToast } from "@/hooks/useToast"
import type { PaginationMeta } from "@/types"
import type { CreateCustomerInput } from "../schemas/customer.schema"

interface Customer {
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
  totalOutstanding: number
}

interface CustomerTableProps {
  data: Customer[]
  meta: PaginationMeta
  isLoading?: boolean
  filters: { search: string; isActive: string }
  onFilterChange: (key: string, value: string) => void
  onPageChange: (page: number) => void
  onRefetch: () => void
}

export function CustomerTable({
  data,
  meta,
  isLoading,
  filters,
  onFilterChange,
  onPageChange,
  onRefetch,
}: CustomerTableProps) {
  const toast = useToast()
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<Customer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  async function handleEdit(formData: CreateCustomerInput) {
    if (!editTarget) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/customers/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal mengupdate customer")
      toast.success("Customer berhasil diupdate")
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
      const res = await fetch(`/api/customers/${deactivateTarget.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menonaktifkan customer")
      toast.success("Customer berhasil dinonaktifkan")
      setDeactivateTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsDeactivating(false)
    }
  }

  const columns: Column<Customer>[] = [
    {
      header: "Nama Customer",
      render: (row) => (
        <div>
          <Link
            href={`/customers/${row.id}`}
            className="font-medium hover:underline"
          >
            {row.name}
          </Link>
          {row.phone && (
            <p className="text-xs text-muted-foreground">{row.phone}</p>
          )}
        </div>
      ),
    },
    {
      header: "Hutang Outstanding",
      render: (row) =>
        row.totalOutstanding > 0 ? (
          <CurrencyDisplay
            amount={row.totalOutstanding}
            className="text-sm font-semibold text-red-600 dark:text-red-400"
          />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
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
            <Link href={`/customers/${row.id}`} aria-label="Detail customer">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setEditTarget(row)}
            aria-label="Edit customer"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {row.isActive && (
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeactivateTarget(row)}
              aria-label="Nonaktifkan customer"
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
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={filters.search}
          onChange={(v) => onFilterChange("search", v)}
          placeholder="Cari nama atau telepon..."
          className="w-64"
        />
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
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="Belum ada customer"
        emptyDescription="Tambah customer untuk mencatat transaksi dan hutang"
        keyExtractor={(row) => row.id}
      />

      <Pagination meta={meta} onPageChange={onPageChange} />

      <CustomerForm
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        defaultValues={editTarget ? {
          name: editTarget.name,
          phone: editTarget.phone ?? "",
          address: editTarget.address ?? "",
          isActive: editTarget.isActive,
        } : undefined}
        onSubmit={handleEdit}
        isLoading={isSubmitting}
        mode="edit"
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
        title="Nonaktifkan Customer"
        description={`Yakin ingin menonaktifkan "${deactivateTarget?.name}"? Customer dengan hutang aktif tidak bisa dinonaktifkan.`}
        confirmLabel="Nonaktifkan"
        isLoading={isDeactivating}
      />
    </div>
  )
}
