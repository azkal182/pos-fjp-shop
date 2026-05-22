import { cn } from "@/lib/utils"

interface PageWrapperProps {
  title?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PageWrapper({ title, actions, children, className }: PageWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-6 p-4 sm:p-6", className)}>
      {(title || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {title && <h2 className="text-xl sm:text-2xl font-bold tracking-tight shrink-0">{title}</h2>}
          {actions && (
            <div className="flex flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
