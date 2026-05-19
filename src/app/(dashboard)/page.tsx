import { PageWrapper } from "@/components/layout/PageWrapper"
import { LayoutDashboard } from "lucide-react"

export default function DashboardPage() {
  return (
    <PageWrapper title="Dashboard">
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <LayoutDashboard className="h-16 w-16 text-muted-foreground/30" />
        <div>
          <h3 className="text-lg font-medium text-muted-foreground">Dashboard</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Akan diimplementasikan di Sprint 7
          </p>
        </div>
      </div>
    </PageWrapper>
  )
}
