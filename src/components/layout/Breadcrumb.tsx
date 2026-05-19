"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

const segmentLabels: Record<string, string> = {
  pos: "Kasir",
  products: "Produk",
  categories: "Kategori",
  vendors: "Vendor",
  purchases: "Pembelian",
  "stock-movements": "Pergerakan Stok",
  customers: "Customer",
  transactions: "Transaksi",
  debts: "Hutang",
  reports: "Laporan",
  settings: "Pengaturan",
  users: "Pengguna",
  new: "Baru",
}

export function Breadcrumb() {
  const pathname = usePathname()

  if (pathname === "/") return null

  const segments = pathname.split("/").filter(Boolean)

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/")
    const label = segmentLabels[segment] ?? segment
    const isLast = index === segments.length - 1
    return { href, label, isLast }
  })

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground px-6 py-2 border-b">
      <Link href="/" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          {crumb.isLast ? (
            <span className={cn("text-foreground font-medium")}>{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
