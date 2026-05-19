import { cn } from "@/lib/utils"

interface StockBadgeProps {
  stock: number
  minStock: number
  className?: string
}

export function StockBadge({ stock, minStock, className }: StockBadgeProps) {
  if (stock === 0) {
    return (
      <span className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
        className
      )}>
        Habis
      </span>
    )
  }

  if (stock <= minStock) {
    return (
      <span className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
        className
      )}>
        Rendah ({stock})
      </span>
    )
  }

  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
      className
    )}>
      {stock}
    </span>
  )
}
