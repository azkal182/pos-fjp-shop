import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Pengaturan" }

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Pengaturan"
      description="Konfigurasi toko, metode bayar POS, dan kategori aging hutang."
      sprint="Sprint 8"
    />
  )
}
