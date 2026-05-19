import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface LowStockAlertProps {
  products: { id: string; name: string; stock: number; minStock: number }[]
  isLoading?: boolean
}

export function LowStockAlert({ products, isLoading }: LowStockAlertProps) {
  if (isLoading || products.length === 0) return null

  return (
    <Card className="border-yellow-200 dark:border-yellow-900/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <CardTitle className="text-base text-yellow-700 dark:text-yellow-400">
            Stok Rendah ({products.length} produk)
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {products.slice(0, 5).map((p) => (
          <div key={p.id} className="flex items-center justify-between text-sm">
            <span className="truncate flex-1">{p.name}</span>
            <span className={`ml-2 font-semibold shrink-0 ${p.stock === 0 ? "text-red-600" : "text-yellow-600"}`}>
              {p.stock === 0 ? "Habis" : `${p.stock} / min ${p.minStock}`}
            </span>
          </div>
        ))}
        {products.length > 5 && (
          <p className="text-xs text-muted-foreground">+{products.length - 5} produk lainnya</p>
        )}
        <Button variant="outline" size="sm" className="w-full mt-2 text-xs" asChild>
          <Link href="/products?lowStock=true">Lihat semua produk stok rendah</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
