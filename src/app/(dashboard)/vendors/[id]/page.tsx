"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Pencil, Plus, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { VendorLedger } from "@/features/vendors/components/VendorLedger"
import { VendorForm } from "@/features/vendors/components/VendorForm"
import { DepositCard } from "@/features/deposits/components/DepositCard"
import { VendorPurchaseHistory } from "@/features/vendors/components/VendorPurchaseHistory"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useToast } from "@/hooks/useToast"
import type { CreateVendorInput } from "@/features/vendors/schemas"

interface Vendor {
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
  _count: { purchases: number }
}

export default function VendorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = params.id as string

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetch(`/api/vendors/${id}`)
      .then((r) => r.json())
      .then((json) => setVendor(json.data))
      .catch(() => router.push("/vendors"))
      .finally(() => setIsLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Kembali</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/vendor-debts/${id}`)}>
            <Building2 className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Hutang</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/purchases/new?vendorId=${id}`)}>
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Pembelian Baru</span>
          </Button>
          <Button size="sm" onClick={() => setIsEditOpen(true)}>
            <Pencil className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="space-y-4 min-w-0">
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <p className="font-semibold">{vendor.name}</p>
            {vendor.phone && <p className="text-sm text-muted-foreground">{vendor.phone}</p>}
            {vendor.address && <p className="text-sm text-muted-foreground">{vendor.address}</p>}
            <div className="flex items-center gap-2 pt-1">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                vendor.isActive
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              }`}>
                {vendor.isActive ? "Aktif" : "Nonaktif"}
              </span>
              <span className="text-xs text-muted-foreground">{vendor._count.purchases} pembelian</span>
            </div>
          </div>
          <DepositCard partyType="VENDOR" partyId={id} refreshKey={refreshKey} />
        </div>

        {/* Main */}
        <div className="lg:col-span-2 min-w-0">
          <Tabs defaultValue="purchases">
            <TabsList className="w-full">
              <TabsTrigger value="purchases" className="flex-1">Riwayat Pembelian</TabsTrigger>
              <TabsTrigger value="ledger" className="flex-1">Buku Besar</TabsTrigger>
            </TabsList>
            <TabsContent value="purchases" className="mt-4">
              <VendorPurchaseHistory
                vendorId={id}
                vendorName={vendor.name}
                onPaymentSuccess={() => setRefreshKey((k) => k + 1)}
              />
            </TabsContent>
            <TabsContent value="ledger" className="mt-4">
              <VendorLedger vendorId={id} refreshKey={refreshKey} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <VendorForm
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        defaultValues={{
          name: vendor.name,
          phone: vendor.phone ?? "",
          address: vendor.address ?? "",
          isActive: vendor.isActive,
        }}
        onSubmit={handleUpdate}
        isLoading={isUpdating}
        mode="edit"
      />
    </PageWrapper>
  )
}
