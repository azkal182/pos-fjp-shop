import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Laporan" }

export default function ReportsPage() {
  return (
    <PlaceholderPage
      title="Laporan"
      description="Laporan penjualan, produk terlaris, hutang per aging, dan profit (revenue − HPP)."
      sprint="Sprint 7"
    />
  )
}
