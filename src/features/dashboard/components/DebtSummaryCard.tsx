import { AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface DebtSummaryCardProps {
  totalOutstanding: number
  debtByAging: { categoryName: string; color: string; total: number }[]
  isLoading?: boolean
}

export function DebtSummaryCard({ totalOutstanding, debtByAging, isLoading }: DebtSummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Piutang Outstanding</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    )
  }

  const maxTotal = Math.max(...debtByAging.map((b) => b.total), 1)

  return (
    <Card className={totalOutstanding > 0 ? "border-red-200 dark:border-red-900/50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Piutang Outstanding</CardTitle>
          {totalOutstanding > 0 && <AlertCircle className="h-4 w-4 text-red-500" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CurrencyDisplay
          amount={totalOutstanding}
          className={`text-2xl font-bold ${totalOutstanding > 0 ? "text-red-600" : "text-muted-foreground"}`}
        />

        {debtByAging.length > 0 && (
          <div className="space-y-2">
            {debtByAging.map((bucket) => (
              <div key={bucket.categoryName}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium" style={{ color: bucket.color }}>{bucket.categoryName}</span>
                  <CurrencyDisplay amount={bucket.total} className="text-xs" />
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(bucket.total / maxTotal) * 100}%`,
                      backgroundColor: bucket.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Link href="/debts" className="text-xs text-primary hover:underline block">
          Lihat semua hutang →
        </Link>
      </CardContent>
    </Card>
  )
}
