"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { Breadcrumb } from "@/components/layout/Breadcrumb"

// Wrapper yang auto-close sidebar mobile saat navigasi
function SidebarAutoClose({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { setOpenMobile, isMobile } = useSidebar()

  useEffect(() => {
    if (isMobile) setOpenMobile(false)
  }, [pathname, isMobile, setOpenMobile])

  return <>{children}</>
}

// Halaman yang tidak perlu breadcrumb
const NO_BREADCRUMB_PATHS = ["/pos"]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SidebarAutoClose>
          <Header />
          <BreadcrumbBar />
          <main className="flex flex-1 flex-col gap-4 p-0 overflow-y-auto">
            {children}
          </main>
        </SidebarAutoClose>
      </SidebarInset>
    </SidebarProvider>
  )
}

function BreadcrumbBar() {
  const pathname = usePathname()
  if (NO_BREADCRUMB_PATHS.some((p) => pathname.startsWith(p))) return null
  return (
    <div className="border-b bg-background/95 px-4 py-2">
      <Breadcrumb />
    </div>
  )
}
