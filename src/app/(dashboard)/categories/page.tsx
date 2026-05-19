import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Kategori" }

export default function CategoriesPage() {
  return (
    <PlaceholderPage
      title="Kategori"
      description="Kelola kategori produk untuk pengelompokan yang lebih terstruktur."
      sprint="Sprint 2"
    />
  )
}
