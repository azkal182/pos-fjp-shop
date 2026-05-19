import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Pergerakan Stok" }

export default function StockMovementsPage() {
  return (
    <PlaceholderPage
      title="Pergerakan Stok"
      description="Log read-only semua pergerakan stok — pembelian, penjualan, dan penyesuaian manual."
      sprint="Sprint 4"
    />
  )
}
