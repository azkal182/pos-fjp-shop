import type { Metadata } from "next"
import { LoginForm } from "@/features/auth/components/LoginForm"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Masuk",
}

export default function LoginPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-center">Masuk</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Masukkan email dan password untuk melanjutkan
        </p>
      </div>
      <LoginForm />
    </div>
  )
}
