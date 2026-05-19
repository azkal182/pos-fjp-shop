export interface NavItem {
  label: string
  href: string
  icon: string // lucide-react icon name
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Kasir (POS)", href: "/pos", icon: "ShoppingCart" },
  { label: "Produk", href: "/products", icon: "Package" },
  { label: "Kategori", href: "/categories", icon: "Tag" },
  { label: "Vendor", href: "/vendors", icon: "Truck" },
  { label: "Pembelian", href: "/purchases", icon: "ShoppingBag" },
  { label: "Pergerakan Stok", href: "/stock-movements", icon: "ArrowLeftRight" },
  { label: "Customer", href: "/customers", icon: "Users" },
  { label: "Transaksi", href: "/transactions", icon: "Receipt" },
  { label: "Hutang", href: "/debts", icon: "CreditCard" },
  { label: "Hutang Vendor", href: "/vendor-debts", icon: "Building2" },
  { label: "Laporan", href: "/reports", icon: "BarChart2" },
  { label: "Pengaturan", href: "/settings", icon: "Settings" },
  { label: "Pengguna", href: "/users", icon: "UserCog" },
]
