import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Hutang" }

export default function DebtsPage() {
  return (
    <PlaceholderPage
      title="Hutang"
      description="Pantau semua hutang outstanding dari seluruh customer. Filter berdasarkan aging category."
      sprint="Sprint 6"
    />
  )
}
