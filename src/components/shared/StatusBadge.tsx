import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Variant = "success" | "warning" | "danger" | "default" | "info"

interface StatusBadgeProps {
  status: string
  variant?: Variant
  className?: string
}

const autoVariantMap: Record<string, Variant> = {
  PAID: "success",
  LUNAS: "success",
  ACTIVE: "success",
  AKTIF: "success",
  PARTIAL: "warning",
  SEBAGIAN: "warning",
  UNPAID: "danger",
  BELUM_BAYAR: "danger",
  INACTIVE: "default",
  NONAKTIF: "default",
  PURCHASE_IN: "success",
  SALE_OUT: "danger",
  ADJUSTMENT_IN: "info",
  ADJUSTMENT_OUT: "warning",
}

const labelMap: Record<string, string> = {
  PAID: "Lunas",
  PARTIAL: "Sebagian",
  UNPAID: "Belum Bayar",
  PURCHASE_IN: "Barang Masuk",
  SALE_OUT: "Penjualan",
  ADJUSTMENT_IN: "Penyesuaian Masuk",
  ADJUSTMENT_OUT: "Penyesuaian Keluar",
  CASH: "Tunai",
  TRANSFER: "Transfer",
}

const variantClasses: Record<Variant, string> = {
  success: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
  danger: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  default: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolvedVariant = variant ?? autoVariantMap[status] ?? "default"
  const label = labelMap[status] ?? status

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantClasses[resolvedVariant],
        className
      )}
    >
      {label}
    </span>
  )
}
