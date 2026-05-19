"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb"

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

/** Truncate long IDs/slugs to a readable label */
function getLabel(segment: string): string {
  if (segmentLabels[segment]) return segmentLabels[segment]
  // Looks like a cuid/uuid — show truncated
  if (segment.length > 16) return `${segment.slice(0, 8)}…`
  return segment
}

export function Breadcrumb() {
  const pathname = usePathname()

  if (pathname === "/") {
    return (
      <BreadcrumbRoot>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </BreadcrumbRoot>
    )
  }

  const segments = pathname.split("/").filter(Boolean)
  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/")
    const label = getLabel(segment)
    const isLast = index === segments.length - 1
    return { href, label, isLast, segment }
  })

  // Collapse middle crumbs if more than 3 deep
  const shouldCollapse = crumbs.length > 3
  const visibleCrumbs = shouldCollapse
    ? [crumbs[0], null, crumbs[crumbs.length - 1]] // null = ellipsis
    : crumbs

  return (
    <BreadcrumbRoot>
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        <BreadcrumbItem className="shrink-0">
          <BreadcrumbLink asChild>
            <Link href="/">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {visibleCrumbs.map((crumb, i) => (
          <span key={i} className="contents">
            <BreadcrumbSeparator className="shrink-0" />
            {crumb === null ? (
              <BreadcrumbItem className="shrink-0">
                <BreadcrumbEllipsis />
              </BreadcrumbItem>
            ) : (
              <BreadcrumbItem className={crumb.isLast ? "min-w-0" : "shrink-0"}>
                {crumb.isLast ? (
                  <BreadcrumbPage className="max-w-[160px] truncate block">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className="shrink-0">
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            )}
          </span>
        ))}
      </BreadcrumbList>
    </BreadcrumbRoot>
  )
}
