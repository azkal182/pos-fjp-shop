import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Customer" }

export default function CustomersPage() {
  return (
    <PlaceholderPage
      title="Customer"
      description="Kelola data customer terdaftar. Customer dengan hutang aktif tidak dapat dinonaktifkan."
      sprint="Sprint 3"
    />
  )
}
