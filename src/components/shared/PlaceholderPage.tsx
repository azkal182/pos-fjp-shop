import { Construction } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PageWrapper } from "@/components/layout/PageWrapper"

interface PlaceholderPageProps {
  title: string
  description?: string
  sprint?: string
}

export function PlaceholderPage({
  title,
  description,
  sprint,
}: PlaceholderPageProps) {
  return (
    <PageWrapper title={title}>
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-muted">
          <Construction className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {description ?? "Halaman ini sedang dalam pengembangan."}
          </p>
          {sprint && (
            <Badge variant="outline" className="mt-2">
              {sprint}
            </Badge>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
