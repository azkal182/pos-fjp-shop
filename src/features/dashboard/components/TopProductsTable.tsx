import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { Skeleton } from "@/components/ui/skeleton"

interface TopProductsTableProps {
  products: { productId: string; name: string; totalQty: number; totalRevenue: number }[]
  isLoading?: boolean
}

export function TopProductsTable({ products, isLoading }: TopProductsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Produk Terlaris Bulan Ini</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Produk Terlaris Bulan Ini</CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Belum ada data penjualan</p>
        ) : (
          <div className="space-y-0">
            {products.map((p, i) => (
              <div key={p.productId} className="flex items-center gap-3 py-2.5 border-b last:border-0">
                <span className={`text-sm font-bold w-5 shrink-0 ${
                  i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.totalQty} terjual</p>
                </div>
                <CurrencyDisplay amount={p.totalRevenue} className="text-sm font-semibold shrink-0" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
