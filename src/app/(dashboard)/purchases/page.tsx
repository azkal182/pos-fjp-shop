import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Pembelian" }

export default function PurchasesPage() {
  return (
    <PlaceholderPage
      title="Pembelian"
      description="Catat pembelian barang dari vendor. Stok otomatis bertambah dan perubahan harga terdeteksi."
      sprint="Sprint 4"
    />
  )
}
