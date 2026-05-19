"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, ShoppingCart, Package, Tag, Truck, ShoppingBag,
  ArrowLeftRight, Users, Receipt, CreditCard, BarChart2, Settings,
  UserCog, Store,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { navItems } from "@/config/nav.config"
import { APP_NAME } from "@/config/app.config"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, ShoppingCart, Package, Tag, Truck, ShoppingBag,
  ArrowLeftRight, Users, Receipt, CreditCard, BarChart2, Settings, UserCog,
}

// Kelompokkan nav items
const navGroups = [
  {
    label: "Utama",
    items: ["Dashboard", "Kasir (POS)"],
  },
  {
    label: "Inventori",
    items: ["Produk", "Kategori", "Vendor", "Pembelian", "Pergerakan Stok"],
  },
  {
    label: "Penjualan",
    items: ["Customer", "Transaksi", "Hutang"],
  },
  {
    label: "Analitik",
    items: ["Laporan"],
  },
  {
    label: "Sistem",
    items: ["Pengaturan", "Pengguna"],
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      {/* Header — Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={APP_NAME}>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Store className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-sm">{APP_NAME}</span>
                  <span className="text-xs text-muted-foreground">Point of Sale</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Content — Nav Groups */}
      <SidebarContent>
        {navGroups.map((group) => {
          const groupItems = navItems.filter((item) =>
            group.items.includes(item.label)
          )
          if (groupItems.length === 0) return null

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {groupItems.map((item) => {
                    const Icon = iconMap[item.icon]
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href)

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                        >
                          <Link href={item.href}>
                            {Icon && <Icon />}
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
