import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Hutang Customer" }

export default function CustomerDebtPage() {
  return (
    <PlaceholderPage
      title="Hutang Customer"
      description="Daftar hutang per customer beserta riwayat pembayaran dan FIFO allocation preview."
      sprint="Sprint 6"
    />
  )
}
