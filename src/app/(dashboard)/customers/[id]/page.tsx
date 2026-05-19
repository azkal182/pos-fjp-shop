import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Detail Customer" }

export default function CustomerDetailPage() {
  return (
    <PlaceholderPage
      title="Detail Customer"
      description="Informasi customer, riwayat transaksi, dan ringkasan hutang outstanding."
      sprint="Sprint 3"
    />
  )
}
