import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { Skeleton } from "@/components/ui/skeleton"

interface SalesCardProps {
  title: string
  value: number
  period?: string
  change?: number
  isCount?: boolean
  isLoading?: boolean
  subtitle?: string
  // variant: default = penjualan, cash = kas masuk (hijau), debt = piutang (oranye)
  variant?: "default" | "cash" | "debt"
}

export function SalesCard({
  title, value, period, change, isCount = false, isLoading, subtitle, variant = "default",
}: SalesCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    )
  }

  const hasChange = change !== undefined
  const isPositive = (change ?? 0) >= 0
  const isNeutral = change === 0

  const valueColor =
    variant === "cash" ? "text-green-600 dark:text-green-400" :
    variant === "debt" ? "text-orange-600 dark:text-orange-400" :
    ""

  const borderColor =
    variant === "cash" ? "border-green-200 dark:border-green-900/50" :
    variant === "debt" ? "border-orange-200 dark:border-orange-900/50" :
    ""

  return (
    <Card className={borderColor}>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <div className="mt-1.5">
          {isCount ? (
            <p className={`text-3xl font-bold ${valueColor}`}>{value.toLocaleString("id-ID")}</p>
          ) : (
            <CurrencyDisplay amount={value} className={`text-2xl font-bold ${valueColor}`} />
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
        {hasChange && (
          <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${
            isNeutral ? "text-muted-foreground" : isPositive ? "text-green-600" : "text-red-600"
          }`}>
            {isNeutral ? (
              <Minus className="h-3.5 w-3.5" />
            ) : isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>{Math.abs(change ?? 0).toFixed(1)}% vs {period ?? "periode lalu"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
