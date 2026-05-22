import { prisma } from "@/lib/prisma"
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, subMonths, subDays, format,
} from "date-fns"
import { getDebtReport } from "@/features/reports/services/report.service"
import type { DashboardData } from "../types/dashboard.types"

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const prevMonthStart = startOfMonth(subMonths(now, 1))
  const prevMonthEnd = endOfMonth(subMonths(now, 1))
  const thirtyDaysAgo = startOfDay(subDays(now, 29))

  const [
    todayAgg,
    weekAgg,
    monthAgg,
    prevMonthAgg,
    debtAgg,
    vendorDebtAgg,
    allVendors,
    lowStockProducts,
    chartData,
    topProductsRaw,
    debtReport,
  ] = await Promise.all([
    // Hari ini
    prisma.transaction.aggregate({
      where: { confirmationStatus: "CONFIRMED", paymentStatus: { in: ["PAID", "PARTIAL"] }, transactionDate: { gte: todayStart, lte: todayEnd } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    // Minggu ini
    prisma.transaction.aggregate({
      where: { confirmationStatus: "CONFIRMED", paymentStatus: { in: ["PAID", "PARTIAL"] }, transactionDate: { gte: weekStart, lte: todayEnd } },
      _sum: { totalAmount: true },
    }),
    // Bulan ini
    prisma.transaction.aggregate({
      where: { confirmationStatus: "CONFIRMED", paymentStatus: { in: ["PAID", "PARTIAL"] }, transactionDate: { gte: monthStart, lte: monthEnd } },
      _sum: { totalAmount: true },
    }),
    // Bulan lalu
    prisma.transaction.aggregate({
      where: { confirmationStatus: "CONFIRMED", paymentStatus: { in: ["PAID", "PARTIAL"] }, transactionDate: { gte: prevMonthStart, lte: prevMonthEnd } },
      _sum: { totalAmount: true },
    }),
    // Total piutang outstanding (customer)
    prisma.debt.aggregate({
      where: { status: { in: ["UNPAID", "PARTIAL"] } },
      _sum: { remainingAmount: true },
    }),
    // Hutang ke vendor outstanding
    prisma.vendorDebt.groupBy({
      by: ["vendorId"],
      where: { status: { in: ["UNPAID", "PARTIAL"] } },
      _sum: { remainingAmount: true },
    }),
    // Top 4 vendor dengan hutang terbesar + semua vendor aktif untuk padding
    prisma.vendor.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    // Produk stok rendah
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, stock: true, minStock: true },
    }).then((products) => products.filter((p) => p.stock <= p.minStock)),
    // Grafik 30 hari
    prisma.transaction.findMany({
      where: { confirmationStatus: "CONFIRMED", paymentStatus: { in: ["PAID", "PARTIAL"] }, transactionDate: { gte: thirtyDaysAgo, lte: todayEnd } },
      select: { totalAmount: true, transactionDate: true },
      orderBy: { transactionDate: "asc" },
    }),
    // Top 5 produk bulan ini
    prisma.transactionItem.groupBy({
      by: ["productId"],
      where: {
        transaction: {
          confirmationStatus: "CONFIRMED",
          paymentStatus: { in: ["PAID", "PARTIAL"] },
          transactionDate: { gte: monthStart, lte: monthEnd },
        },
      },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    // Debt report untuk aging breakdown
    getDebtReport(),
  ])

  // Hitung % perubahan bulan ini vs bulan lalu
  const monthRevenue = Number(monthAgg._sum.totalAmount ?? 0)
  const prevMonthRevenue = Number(prevMonthAgg._sum.totalAmount ?? 0)
  const monthRevenueChange =
    prevMonthRevenue > 0
      ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
      : monthRevenue > 0 ? 100 : 0

  // Grafik: group by hari
  const chartMap = new Map<string, number>()
  for (const trx of chartData) {
    const key = format(trx.transactionDate, "yyyy-MM-dd")
    chartMap.set(key, (chartMap.get(key) ?? 0) + Number(trx.totalAmount))
  }
  const salesChart = Array.from(chartMap.entries()).map(([date, revenue]) => ({ date, revenue }))

  // Top products: fetch nama produk
  const productIds = topProductsRaw.map((p) => p.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  })
  const productMap = new Map(products.map((p) => [p.id, p.name]))

  const topProducts = topProductsRaw.map((p) => ({
    productId: p.productId,
    name: productMap.get(p.productId) ?? "Unknown",
    totalQty: p._sum.quantity ?? 0,
    totalRevenue: Number(p._sum.subtotal ?? 0),
  }))

  // Build vendor debt map
  const vendorDebtMap = new Map(
    vendorDebtAgg.map((v) => [v.vendorId, Number(v._sum.remainingAmount ?? 0)])
  )
  const vendorNameMap = new Map(allVendors.map((v) => [v.id, v.name]))

  // Top 4: vendor berpiutang diurutkan terbesar, sisanya diisi vendor tanpa hutang
  const vendorsWithDebt = vendorDebtAgg
    .map((v) => ({
      vendorId: v.vendorId,
      vendorName: vendorNameMap.get(v.vendorId) ?? "Unknown",
      totalOutstanding: Number(v._sum.remainingAmount ?? 0),
    }))
    .sort((a, b) => b.totalOutstanding - a.totalOutstanding)

  const vendorsWithoutDebt = allVendors
    .filter((v) => !vendorDebtMap.has(v.id))
    .map((v) => ({ vendorId: v.id, vendorName: v.name, totalOutstanding: 0 }))

  const topVendors = [...vendorsWithDebt, ...vendorsWithoutDebt].slice(0, 4)

  return {
    salesSummary: {
      todayRevenue: Number(todayAgg._sum.totalAmount ?? 0),
      todayTransactions: todayAgg._count,
      weekRevenue: Number(weekAgg._sum.totalAmount ?? 0),
      monthRevenue,
      monthRevenueChange,
    },
    totalOutstandingDebt: Number(debtAgg._sum.remainingAmount ?? 0),
    vendorDebtSummary: {
      totalOutstanding: vendorsWithDebt.reduce((s, v) => s + v.totalOutstanding, 0),
      vendorCount: vendorsWithDebt.length,
      topVendors,
    },
    lowStockProducts,
    salesChart,
    topProducts,
    debtByAging: debtReport.buckets.map((b) => ({
      categoryName: b.categoryName,
      color: b.color,
      total: b.totalOutstanding,
    })),
  }
}
