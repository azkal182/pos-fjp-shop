"use client"

import { usePathname, useRouter } from "next/navigation"
import { LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { navItems } from "@/config/nav.config"
import { signOut, useSession } from "@/lib/auth-client"

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard"
  const match = navItems.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href)
  )
  return match?.label ?? "Halaman"
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  const title = getPageTitle(pathname)
  const user = session?.user
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U"

  async function handleLogout() {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-background min-h-[57px]">
      <h1 className="text-lg font-semibold">{title}</h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm hidden sm:block">{user?.name ?? "User"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
