import type { Metadata } from "next"
import { PlaceholderPage } from "@/components/shared/PlaceholderPage"

export const metadata: Metadata = { title: "Pengguna" }

export default function UsersPage() {
  return (
    <PlaceholderPage
      title="Pengguna"
      description="Manajemen akun pengguna sistem. Tambah, edit, dan hapus akun admin."
      sprint="Sprint 8"
    />
  )
}
