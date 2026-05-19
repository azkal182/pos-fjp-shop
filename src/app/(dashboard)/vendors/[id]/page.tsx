"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { VendorDebtSummary } from "@/features/vendors/components/VendorDebtSummary"
import { VendorDebtTable } from "@/features/vendors/components/VendorDebtTable"
import { VendorLedger } from "@/features/vendors/components/VendorLedger"
import { VendorForm } from "@/features/vendors/components/VendorForm"
import { DepositCard } from "@/features/deposits/components/DepositCard"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useToast } from "@/hooks/useToast"
import type { PaginationMeta } from "@/types"
import type { CreateVendorInput } from "@/features/vendors/schemas"

interface Vendor {
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
  _count: { purchases: number }
}

interface VendorDebt {
  id: string
  vendorId: string
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  status: string
  debtDate: string
  vendor: { id: string; name: string; phone: string | null }
  purchase: { code: string }
}

export default function VendorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = params.id as string

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [debts, setDebts] = useState<VendorDebt[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ status: "" })
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetch(`/api/vendors/${id}`)
      .then((r) => r.json())
      .then((json) => setVendor(json.data))
      .catch(() => router.push("/vendors"))
      .finally(() => setIsLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDebts = useCallback(async () => {
    try {
      const p = new URLSearchParams()
      p.set("vendorId", id)
      p.set("page", String(page))
      if (filters.status) p.set("status", filters.status)
      const res = await fetch(`/api/vendor-debts?${p}`)
      const json = await res.json()
      setDebts(json.data ?? [])
      setMeta(json.meta)
    } catch { toast.error("Gagal memuat hutang") }
  }, [id, page, filters.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDebts() }, [fetchDebts])

  function handlePaymentSuccess() {
    fetchDebts()
    setRefreshKey((k) => k + 1)
  }

  async function handleUpdate(data: CreateVendorInput) {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal mengupdate vendor")
      toast.success("Vendor berhasil diupdate")
      setIsEditOpen(false)
      setVendor((prev) => prev ? { ...prev, ...data } : prev)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally { setIsUpdating(false) }
  }

  if (isLoading || !vendor) return <LoadingSpinner centered />

  return (
    <PageWrapper
      title={vendor.name}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <Button onClick={() => setIsEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <p className="font-semibold">{vendor.name}</p>
            {vendor.phone && <p className="text-sm text-muted-foreground">{vendor.phone}</p>}
            {vendor.address && <p className="text-sm text-muted-foreground">{vendor.address}</p>}
            <div className="flex items-center gap-2 pt-1">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${vendor.isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {vendor.isActive ? "Aktif" : "Nonaktif"}
              </span>
              <span className="text-xs text-muted-foreground">{vendor._count.purchases} pembelian</span>
            </div>
          </div>
          <VendorDebtSummary vendorId={id} refreshKey={refreshKey} />
          <DepositCard partyType="VENDOR" partyId={id} refreshKey={refreshKey} />
        </div>

        {/* Main */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="ledger">
            <TabsList className="w-full">
              <TabsTrigger value="ledger" className="flex-1">Buku Besar</TabsTrigger>
              <TabsTrigger value="debts" className="flex-1">Hutang per PO</TabsTrigger>
            </TabsList>
            <TabsContent value="ledger" className="mt-4">
              <VendorLedger vendorId={id} refreshKey={refreshKey} />
            </TabsContent>
            <TabsContent value="debts" className="mt-4">
              <VendorDebtTable
                data={debts}
                meta={meta}
                isGlobal={false}
                filters={filters}
                onFilterChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
                onPageChange={setPage}
                onRefetch={handlePaymentSuccess}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <VendorForm
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        defaultValues={{ name: vendor.name, phone: vendor.phone ?? "", address: vendor.address ?? "", isActive: vendor.isActive }}
        onSubmit={handleUpdate}
        isLoading={isUpdating}
        mode="edit"
      />
    </PageWrapper>
  )
}
