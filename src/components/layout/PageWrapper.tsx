import { cn } from "@/lib/utils"

interface PageWrapperProps {
  title?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PageWrapper({ title, actions, children, className }: PageWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between">
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
