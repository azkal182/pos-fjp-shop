"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Pencil, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { StockBadge } from "@/features/products/components/StockBadge"
import { ProductForm } from "@/features/products/components/ProductForm"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useToast } from "@/hooks/useToast"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { CreateProductInput } from "@/features/products/schemas/product.schema"

interface StockMovement {
  id: string
  type: string
  quantity: number
  stockBefore: number
  stockAfter: number
  referenceCode: string | null
  notes: string | null
  createdAt: string
}

interface ProductDetail {
  id: string
  code: string
  name: string
  unit: string
  buyPrice: number
  sellPrice: number
  stock: number
  minStock: number
  isActive: boolean
  category: { id: string; name: string }
  _count: { stockMovements: number }
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = params.id as string

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMovementsLoading, setIsMovementsLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  async function fetchProduct() {
    try {
      const res = await fetch(`/api/products/${id}`)
      if (!res.ok) { router.push("/products"); return }
      const json = await res.json()
      setProduct(json.data)
    } catch {
      router.push("/products")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchMovements() {
    setIsMovementsLoading(true)
    try {
      const res = await fetch(`/api/stock-movements?productId=${id}&limit=20`)
      const json = await res.json()
      setMovements(json.data ?? [])
    } catch {
      // silent
    } finally {
      setIsMovementsLoading(false)
    }
  }

  useEffect(() => {
    fetchProduct()
    fetchMovements()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpdate(formData: CreateProductInput) {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal mengupdate produk")
      toast.success("Produk berhasil diupdate")
      setIsEditOpen(false)
      fetchProduct()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsUpdating(false)
    }
  }

  const movementColumns: Column<StockMovement>[] = [
    {
      header: "Tipe",
      render: (row) => <StatusBadge status={row.type} />,
    },
    {
      header: "Qty",
      render: (row) => (
        <span className={row.quantity > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
          {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
        </span>
      ),
    },
    {
      header: "Stok Sebelum → Sesudah",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.stockBefore} → <span className="font-medium text-foreground">{row.stockAfter}</span>
        </span>
      ),
    },
    {
      header: "Referensi",
      render: (row) => (
        <span className="font-mono text-xs">{row.referenceCode ?? "—"}</span>
      ),
    },
    {
      header: "Tanggal",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.createdAt), "dd MMM yyyy HH:mm", { locale: idLocale })}
        </span>
      ),
    },
  ]

  if (isLoading) return <LoadingSpinner centered />

  if (!product) return null

  return (
    <PageWrapper
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <Button onClick={() => setIsEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Produk
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info Produk */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{product.name}</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono">{product.code}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kategori</span>
                <span className="font-medium">{product.category.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Satuan</span>
                <span className="font-medium">{product.unit}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Harga Beli (HPP)</span>
                <CurrencyDisplay amount={Number(product.buyPrice)} className="text-sm" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Harga Jual</span>
                <CurrencyDisplay amount={Number(product.sellPrice)} className="text-sm font-semibold" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margin</span>
                <span className="font-medium text-green-600">
                  <CurrencyDisplay amount={Number(product.sellPrice) - Number(product.buyPrice)} />
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Stok Saat Ini</span>
                <StockBadge stock={product.stock} minStock={product.minStock} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Min Stok</span>
                <span className="font-medium">{product.minStock}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Status</span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  product.isActive
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                }`}>
                  {product.isActive ? "Aktif" : "Nonaktif"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Riwayat Stok */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Riwayat Pergerakan Stok</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={movementColumns}
                data={movements}
                isLoading={isMovementsLoading}
                emptyMessage="Belum ada pergerakan stok"
                emptyDescription="Stok akan tercatat saat ada pembelian atau penjualan"
                keyExtractor={(row) => row.id}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ProductForm
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        defaultValues={{
          code: product.code,
          name: product.name,
          categoryId: product.category.id,
          unit: product.unit,
          buyPrice: Number(product.buyPrice),
          sellPrice: Number(product.sellPrice),
          minStock: product.minStock,
          isActive: product.isActive,
        }}
        onSubmit={handleUpdate}
        isLoading={isUpdating}
        mode="edit"
      />
    </PageWrapper>
  )
}
