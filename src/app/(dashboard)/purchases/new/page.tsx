import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Pembelian Baru" }

export default function NewPurchasePage() {
  return (
    <PlaceholderPage
      title="Pembelian Baru"
      description="Form input pembelian barang multi-item dari vendor."
      sprint="Sprint 4"
    />
  )
}
