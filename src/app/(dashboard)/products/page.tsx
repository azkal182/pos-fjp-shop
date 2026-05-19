import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Produk" }

export default function ProductsPage() {
  return (
    <PlaceholderPage
      title="Produk"
      description="Kelola data produk — tambah, edit, dan nonaktifkan produk beserta harga dan stok minimum."
      sprint="Sprint 2"
    />
  )
}
