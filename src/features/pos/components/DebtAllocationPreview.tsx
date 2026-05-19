import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { FifoPreview } from "@/features/debts/types/debt.types"

interface DebtAllocationPreviewProps {
  preview: FifoPreview | null
  isLoading?: boolean
}

export function DebtAllocationPreview({ preview, isLoading }: DebtAllocationPreviewProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (!preview || preview.allocations.length === 0) return null

  return (
    <div className="rounded-md border overflow-hidden text-xs">
      <div className="bg-muted/50 px-3 py-1.5 font-medium text-xs text-muted-foreground">
        Alokasi ke Hutang Lama (FIFO)
      </div>
      <div className="divide-y">
        {preview.allocations.map((alloc) => (
          <div
            key={alloc.debtId}
            className={`flex items-center justify-between px-3 py-2 gap-2 ${
              alloc.willBeFullyPaid
                ? "bg-green-50 dark:bg-green-950/20"
                : "bg-yellow-50 dark:bg-yellow-950/20"
            }`}
          >
            <div className="min-w-0">
              <p className="font-mono font-medium">{alloc.debtCode}</p>
              <p className="text-muted-foreground">
                {format(new Date(alloc.debtDate), "dd MMM yyyy", { locale: idLocale })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold">
                <CurrencyDisplay amount={alloc.allocatedAmount} className="text-xs" />
              </p>
              {alloc.willBeFullyPaid ? (
                <span className="text-green-600 font-medium">LUNAS</span>
              ) : (
                <span className="text-yellow-600">
                  Sisa <CurrencyDisplay amount={alloc.remainingAfter} className="text-xs" />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-muted/30 px-3 py-1.5 flex justify-between font-medium">
        <span>Total dialokasikan</span>
        <CurrencyDisplay amount={preview.totalAllocated} className="text-xs font-semibold" />
      </div>
      {preview.remainingChange > 0 && (
        <div className="bg-green-50 dark:bg-green-950/20 px-3 py-1.5 flex justify-between text-green-700 dark:text-green-400">
          <span>Kembalian</span>
          <CurrencyDisplay amount={preview.remainingChange} className="text-xs font-semibold" />
        </div>
      )}
    </div>
  )
}
