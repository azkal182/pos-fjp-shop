"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"

interface DebtSummary {
  totalOutstanding: number
  activeDebtsCount: number
  oldestDays: number | null
}

export function VendorDebtSummary({ vendorId, refreshKey }: { vendorId: string; refreshKey?: number }) {
  const [summary, setSummary] = useState<DebtSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/vendors/${vendorId}/debts`)
      .then((r) => r.json())
      .then((json) => setSummary(json.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [vendorId, refreshKey])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-40" />
        </CardContent>
      </Card>
    )
  }

  if (!summary || summary.totalOutstanding === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Tidak ada hutang ke vendor ini</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Hutang ke Vendor</span>
        </div>
        <div>
          <CurrencyDisplay
            amount={summary.totalOutstanding}
            className="text-2xl font-bold text-red-700 dark:text-red-400"
          />
          <p className="text-xs text-muted-foreground mt-0.5">
            dari {summary.activeDebtsCount} PO belum lunas
          </p>
        </div>
        {summary.oldestDays !== null && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>PO terlama: <span className="font-medium text-foreground">{summary.oldestDays} hari</span></span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
