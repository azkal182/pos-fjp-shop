import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Transaksi" }

export default function TransactionsPage() {
  return (
    <PlaceholderPage
      title="Transaksi"
      description="Riwayat semua transaksi penjualan. Filter berdasarkan tanggal, status, dan customer."
      sprint="Sprint 5"
    />
  )
}
