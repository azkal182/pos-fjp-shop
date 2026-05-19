import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Detail Produk" }

export default function ProductDetailPage() {
  return (
    <PlaceholderPage
      title="Detail Produk"
      description="Informasi lengkap produk beserta riwayat pergerakan stok."
      sprint="Sprint 2"
    />
  )
}
