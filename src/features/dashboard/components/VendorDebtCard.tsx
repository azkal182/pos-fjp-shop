import Link from "next/link"
import { Building2, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { Skeleton } from "@/components/ui/skeleton"

interface VendorRow {
  vendorId: string
  vendorName: string
  totalOutstanding: number
}

interface VendorDebtCardProps {
  totalOutstanding: number
  vendorCount: number
  topVendors: VendorRow[]
  isLoading?: boolean
}

export function VendorDebtCard({ totalOutstanding, vendorCount, topVendors, isLoading }: VendorDebtCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Hutang ke Vendor</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-7 w-36" />
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  const hasDebt = totalOutstanding > 0

  return (
    <Card className={hasDebt ? "border-orange-200 dark:border-orange-900/50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Hutang ke Vendor</CardTitle>
          {hasDebt
            ? <TrendingDown className="h-4 w-4 text-orange-500" />
            : <Building2 className="h-4 w-4 text-muted-foreground" />
          }
        </div>
        <CurrencyDisplay
          amount={totalOutstanding}
          className={`text-xl font-bold ${hasDebt ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}
        />
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {topVendors.map((v) => (
          <Link
            key={v.vendorId}
            href={`/vendor-debts/${v.vendorId}`}
            className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors group"
          >
            <span className="text-xs font-medium truncate text-foreground group-hover:text-primary">
              {v.vendorName}
            </span>
            {v.totalOutstanding > 0 ? (
              <CurrencyDisplay
                amount={v.totalOutstanding}
                className="text-xs font-semibold text-orange-600 dark:text-orange-400 shrink-0 ml-2"
              />
            ) : (
              <span className="text-xs text-muted-foreground shrink-0 ml-2">Lunas</span>
            )}
          </Link>
        ))}

        <div className="pt-1">
          <Link href="/vendor-debts" className="text-xs text-primary hover:underline">
            Lihat semua →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
