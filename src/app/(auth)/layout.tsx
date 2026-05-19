import { APP_NAME } from "@/config/app.config"
import { Store } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">{APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">Sistem Point of Sale</p>
        </div>
        <div className="bg-background rounded-xl border shadow-sm p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
