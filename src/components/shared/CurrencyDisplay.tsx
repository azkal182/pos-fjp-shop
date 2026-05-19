import { formatRupiah } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface CurrencyDisplayProps {
  amount: number | string | { toString(): string }
  className?: string
  colored?: boolean // merah jika negatif, hijau jika positif
}

export function CurrencyDisplay({ amount, className, colored = false }: CurrencyDisplayProps) {
  const num = typeof amount === "number" ? amount : parseFloat(amount.toString())
  const formatted = formatRupiah(num)

  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        colored && num > 0 && "text-green-600 dark:text-green-400",
        colored && num < 0 && "text-red-600 dark:text-red-400",
        className
      )}
    >
      {formatted}
    </span>
  )
}
