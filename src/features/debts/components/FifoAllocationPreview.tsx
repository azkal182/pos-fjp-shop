import { Skeleton } from "@/components/ui/skeleton"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { FifoPreview } from "../types/debt.types"

interface FifoAllocationPreviewProps {
  preview: FifoPreview | null
  isLoading?: boolean
}

export function FifoAllocationPreview({ preview, isLoading }: FifoAllocationPreviewProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (!preview || preview.allocations.length === 0) return null

  return (
    <div className="rounded-md border overflow-hidden text-xs">
      <div className="bg-muted/50 px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
        Preview Alokasi FIFO
      </div>

      <div className="divide-y">
        {preview.allocations.map((alloc) => (
          <div
            key={alloc.debtId}
            className={`grid grid-cols-[1fr_auto] gap-2 px-3 py-2.5 ${
              alloc.willBeFullyPaid
                ? "bg-green-50 dark:bg-green-950/20"
                : "bg-yellow-50 dark:bg-yellow-950/20"
            }`}
          >
            <div>
              <p className="font-mono font-semibold">{alloc.debtCode}</p>
              <p className="text-muted-foreground">
                {format(new Date(alloc.debtDate), "dd MMM yyyy", { locale: idLocale })}
                {" · "}
                Sisa <CurrencyDisplay amount={alloc.currentRemaining} className="text-xs" />
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">
                <CurrencyDisplay amount={alloc.allocatedAmount} className="text-xs" />
              </p>
              {alloc.willBeFullyPaid ? (
                <span className="text-green-600 font-bold">LUNAS ✓</span>
              ) : (
                <span className="text-yellow-600">
                  Sisa <CurrencyDisplay amount={alloc.remainingAfter} className="text-xs" />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/30 px-3 py-2 flex justify-between font-semibold">
        <span>Total Dialokasikan</span>
        <CurrencyDisplay amount={preview.totalAllocated} className="text-xs font-bold" />
      </div>

      {preview.remainingChange > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/20 px-3 py-2 flex justify-between text-blue-700 dark:text-blue-400">
          <span>Sisa (tidak dialokasikan)</span>
          <CurrencyDisplay amount={preview.remainingChange} className="text-xs font-semibold" />
        </div>
      )}
    </div>
  )
}
