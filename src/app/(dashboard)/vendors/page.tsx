import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Vendor" }

export default function VendorsPage() {
  return (
    <PlaceholderPage
      title="Vendor"
      description="Kelola data supplier dan vendor untuk keperluan pembelian barang."
      sprint="Sprint 3"
    />
  )
}
