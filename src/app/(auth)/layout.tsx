import Image from "next/image"
import logoHorizontal from "@/assets/logo.png"
import { APP_NAME } from "@/config/app.config"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="bg-background rounded-xl border shadow-sm p-6">
          {/* Logo di dalam card */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center rounded-lg bg-white dark:bg-zinc-900 border border-border px-5 py-2.5">
              <Image
                src={logoHorizontal}
                alt={APP_NAME}
                height={36}
                className="object-contain h-9 w-auto"
                priority
              />
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
