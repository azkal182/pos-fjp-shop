import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Kasir (POS)" }

export default function PosPage() {
  return (
    <PlaceholderPage
      title="Kasir (POS)"
      description="Modul kasir untuk transaksi penjualan. Pilih produk, atur pembayaran, dan proses transaksi."
      sprint="Sprint 5"
    />
  )
}
