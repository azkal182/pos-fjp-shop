"use client"

import { useState } from "react"
import { Pencil, PowerOff, ExternalLink } from "lucide-react"
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
import { VendorForm } from "./VendorForm"
import { useToast } from "@/hooks/useToast"
import type { CreateVendorInput } from "../schemas"

interface Vendor {
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
  _count: { purchases: number }
}

interface VendorTableProps {
  data: Vendor[]
  isLoading?: boolean
  filters: { search: string; isActive: string }
  onFilterChange: (key: string, value: string) => void
  onRefetch: () => void
}

export function VendorTable({
  data,
  isLoading,
  filters,
  onFilterChange,
  onRefetch,
}: VendorTableProps) {
  const toast = useToast()
  const [editTarget, setEditTarget] = useState<Vendor | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<Vendor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  async function handleEdit(formData: CreateVendorInput) {
    if (!editTarget) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/vendors/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal mengupdate vendor")
      toast.success("Vendor berhasil diupdate")
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
      const res = await fetch(`/api/vendors/${deactivateTarget.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menonaktifkan vendor")
      toast.success("Vendor berhasil dinonaktifkan")
      setDeactivateTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsDeactivating(false)
    }
  }

  const columns: Column<Vendor>[] = [
    {
      header: "Nama Vendor",
      render: (row) => (
        <div>
          <Link href={`/vendors/${row.id}`} className="font-medium text-sm hover:underline flex items-center gap-1.5">
            {row.name}
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </Link>
          <p className="text-xs text-muted-foreground">{row._count.purchases} pembelian</p>
        </div>
      ),
    },
    {
      header: "No. Telepon",
      render: (row) => (
        <span className="text-sm">{row.phone ?? <span className="text-muted-foreground">—</span>}</span>
      ),
    },
    {
      header: "Alamat",
      render: (row) => (
        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
          {row.address ?? "—"}
        </span>
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
            <Link href={`/vendors/${row.id}`} aria-label="Detail vendor">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setEditTarget(row)}
            aria-label="Edit vendor"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {row.isActive && (
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeactivateTarget(row)}
              aria-label="Nonaktifkan vendor"
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
          placeholder="Cari nama vendor..."
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
        emptyMessage="Belum ada vendor"
        emptyDescription="Tambah vendor untuk mulai mencatat pembelian barang"
        keyExtractor={(row) => row.id}
      />

      <VendorForm
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
        title="Nonaktifkan Vendor"
        description={`Yakin ingin menonaktifkan vendor "${deactivateTarget?.name}"?`}
        confirmLabel="Nonaktifkan"
        isLoading={isDeactivating}
      />
    </div>
  )
}
