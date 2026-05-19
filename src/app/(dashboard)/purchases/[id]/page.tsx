"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface PurchaseItem {
  id: string
  quantity: number
  buyPrice: number
  previousBuyPrice: number | null
  priceChanged: boolean
  subtotal: number
  product: { id: string; name: string; code: string; unit: string }
}

interface PurchaseDetail {
  id: string
  code: string
  totalAmount: number
  purchaseDate: string
  notes: string | null
  vendor: { id: string; name: string; phone: string | null }
  user: { id: string; name: string; email: string }
  items: PurchaseItem[]
}

export default function PurchaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/purchases/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((json) => setPurchase(json.data))
      .catch(() => router.push("/purchases"))
      .finally(() => setIsLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const itemColumns: Column<PurchaseItem>[] = [
    {
      header: "Produk",
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.product.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.product.code}</p>
        </div>
      ),
    },
    {
      header: "Qty",
      render: (row) => <span className="text-sm">{row.quantity} {row.product.unit}</span>,
    },
    {
      header: "Harga Beli",
      render: (row) => (
        <div>
          <CurrencyDisplay amount={Number(row.buyPrice)} className="text-sm" />
          {row.priceChanged && row.previousBuyPrice !== null && (
            <p className="text-xs text-muted-foreground line-through">
              <CurrencyDisplay amount={Number(row.previousBuyPrice)} className="text-xs" />
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Subtotal",
      render: (row) => <CurrencyDisplay amount={Number(row.subtotal)} className="font-medium" />,
    },
  ]

  if (isLoading) return <LoadingSpinner centered />
  if (!purchase) return null

  return (
    <PageWrapper
      actions={
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info Pembelian */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-mono">{purchase.code}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(purchase.purchaseDate), "dd MMMM yyyy", { locale: idLocale })}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vendor</span>
                <span className="font-medium">{purchase.vendor.name}</span>
              </div>
              {purchase.vendor.phone && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Telepon</span>
                  <span>{purchase.vendor.phone}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dicatat oleh</span>
                <span>{purchase.user.name}</span>
              </div>
              {purchase.notes && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">Catatan</p>
                    <p>{purchase.notes}</p>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jumlah Item</span>
                <span className="font-medium">{purchase.items.length} item</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <CurrencyDisplay amount={Number(purchase.totalAmount)} className="font-bold text-base" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Item Pembelian</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={itemColumns}
                data={purchase.items}
                emptyMessage="Tidak ada item"
                keyExtractor={(row) => row.id}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
