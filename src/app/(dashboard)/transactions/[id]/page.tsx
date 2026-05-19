import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Detail Transaksi" }

export default function TransactionDetailPage() {
  return (
    <PlaceholderPage
      title="Detail Transaksi"
      description="Detail lengkap transaksi: item, pembayaran, dan hutang yang terbentuk."
      sprint="Sprint 5"
    />
  )
}
