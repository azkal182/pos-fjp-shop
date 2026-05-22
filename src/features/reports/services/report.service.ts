import { prisma } from "@/lib/prisma"
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays } from "date-fns"
import { getAgingCategories } from "@/features/debts/services/debt-aging.service"
import { classifyDebtClient } from "@/features/debts/utils/aging.utils"
import type { SalesReport, ProductReportItem, DebtReport, ProfitReport } from "../types/report.types"

function parseDate(d?: string): Date | undefined {
  return d ? new Date(d) : undefined
}

// ─── Sales Report ─────────────────────────────────────────────────────────────

export async function getSalesReport(
  dateFrom?: string,
  dateTo?: string,
  groupBy: "day" | "week" | "month" = "day"
): Promise<SalesReport> {
  const from = parseDate(dateFrom) ?? subDays(new Date(), 29)
  const to = parseDate(dateTo) ?? new Date()

  const transactions = await prisma.transaction.findMany({
    where: {
      confirmationStatus: "CONFIRMED",
      paymentStatus: { in: ["PAID", "PARTIAL"] },
      transactionDate: { gte: startOfDay(from), lte: endOfDay(to) },
    },
    select: { totalAmount: true, transactionDate: true },
    orderBy: { transactionDate: "asc" },
  })

  // Group by period
  const grouped = new Map<string, { revenue: number; count: number }>()
  for (const trx of transactions) {
    let key: string
    if (groupBy === "month") {
      key = format(trx.transactionDate, "yyyy-MM")
    } else if (groupBy === "week") {
      key = format(startOfWeek(trx.transactionDate, { weekStartsOn: 1 }), "yyyy-MM-dd")
    } else {
      key = format(trx.transactionDate, "yyyy-MM-dd")
    }
    const existing = grouped.get(key) ?? { revenue: 0, count: 0 }
    grouped.set(key, {
      revenue: existing.revenue + Number(trx.totalAmount),
      count: existing.count + 1,
    })
  }

  const data = Array.from(grouped.entries()).map(([date, v]) => ({
    date,
    totalRevenue: v.revenue,
    transactionCount: v.count,
  }))

  const totalRevenue = transactions.reduce((s, t) => s + Number(t.totalAmount), 0)
  const totalTransactions = transactions.length

  // Periode sebelumnya untuk perbandingan
  const periodMs = to.getTime() - from.getTime()
  const prevFrom = new Date(from.getTime() - periodMs)
  const prevTo = new Date(from.getTime() - 1)

  const prevTrx = await prisma.transaction.aggregate({
    where: {
      confirmationStatus: "CONFIRMED",
      paymentStatus: { in: ["PAID", "PARTIAL"] },
      transactionDate: { gte: startOfDay(prevFrom), lte: endOfDay(prevTo) },
    },
    _sum: { totalAmount: true },
  })
  const comparisonRevenue = Number(prevTrx._sum.totalAmount ?? 0)
  const revenueChange =
    comparisonRevenue > 0
      ? ((totalRevenue - comparisonRevenue) / comparisonRevenue) * 100
      : totalRevenue > 0 ? 100 : 0

  return { data, totalRevenue, totalTransactions, comparisonRevenue, revenueChange }
}

// ─── Product Report ───────────────────────────────────────────────────────────

export async function getProductReport(
  dateFrom?: string,
  dateTo?: string,
  categoryId?: string
): Promise<ProductReportItem[]> {
  const from = parseDate(dateFrom) ?? subDays(new Date(), 29)
  const to = parseDate(dateTo) ?? new Date()

  const items = await prisma.transactionItem.findMany({
    where: {
      transaction: {
        confirmationStatus: "CONFIRMED",
        paymentStatus: { in: ["PAID", "PARTIAL"] },
        transactionDate: { gte: startOfDay(from), lte: endOfDay(to) },
      },
      ...(categoryId && { product: { categoryId } }),
    },
    include: {
      product: { include: { category: { select: { name: true } } } },
    },
  })

  const grouped = new Map<string, ProductReportItem>()
  for (const item of items) {
    const existing = grouped.get(item.productId)
    const qty = item.quantity
    const revenue = Number(item.sellPrice) * qty - Number(item.discountAmount) * qty
    const profit = (Number(item.sellPrice) - Number(item.buyPrice)) * qty

    if (existing) {
      existing.totalQty += qty
      existing.totalRevenue += revenue
      existing.totalProfit += profit
    } else {
      grouped.set(item.productId, {
        productId: item.productId,
        productCode: item.product.code,
        productName: item.product.name,
        categoryName: item.product.category.name,
        totalQty: qty,
        totalRevenue: revenue,
        totalProfit: profit,
      })
    }
  }

  return Array.from(grouped.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

// ─── Debt Report ──────────────────────────────────────────────────────────────

export async function getDebtReport(): Promise<DebtReport> {
  const [debts, categories] = await Promise.all([
    prisma.debt.findMany({
      where: { status: { in: ["UNPAID", "PARTIAL"] } },
      select: { customerId: true, remainingAmount: true, debtDate: true },
    }),
    getAgingCategories(),
  ])

  const bucketMap = new Map<string, { count: number; total: number; color: string }>()
  // Init buckets
  for (const cat of categories) {
    bucketMap.set(cat.name, { count: 0, total: 0, color: cat.color })
  }
  bucketMap.set("Tidak Dikategorikan", { count: 0, total: 0, color: "#6b7280" })

  for (const debt of debts) {
    const result = classifyDebtClient(debt.debtDate, categories)
    const key = result?.category.name ?? "Tidak Dikategorikan"
    const existing = bucketMap.get(key)!
    bucketMap.set(key, {
      count: existing.count + 1,
      total: existing.total + Number(debt.remainingAmount),
      color: result?.color ?? "#6b7280",
    })
  }

  const buckets = Array.from(bucketMap.entries())
    .filter(([, v]) => v.count > 0)
    .map(([name, v]) => ({
      categoryName: name,
      color: v.color,
      count: v.count,
      totalOutstanding: v.total,
    }))

  const uniqueCustomers = new Set(debts.map((d) => d.customerId)).size
  const totalOutstanding = debts.reduce((s, d) => s + Number(d.remainingAmount), 0)

  return { buckets, totalOutstanding, totalCustomersWithDebt: uniqueCustomers }
}

// ─── Profit Report ────────────────────────────────────────────────────────────

export async function getProfitReport(
  dateFrom?: string,
  dateTo?: string
): Promise<ProfitReport> {
  const from = parseDate(dateFrom) ?? subDays(new Date(), 29)
  const to = parseDate(dateTo) ?? new Date()

  const items = await prisma.transactionItem.findMany({
    where: {
      transaction: {
        confirmationStatus: "CONFIRMED",
        paymentStatus: { in: ["PAID", "PARTIAL"] },
        transactionDate: { gte: startOfDay(from), lte: endOfDay(to) },
      },
    },
    include: {
      transaction: { select: { transactionDate: true, packingFee: true } },
    },
  })

  const byDay = new Map<string, { revenue: number; hpp: number; profit: number }>()
  let totalRevenue = 0
  let totalHPP = 0

  for (const item of items) {
    const date = format(item.transaction.transactionDate, "yyyy-MM-dd")
    const qty = item.quantity
    const revenue = Number(item.sellPrice) * qty - Number(item.discountAmount) * qty
    const hpp = Number(item.buyPrice) * qty
    const profit = revenue - hpp

    totalRevenue += revenue
    totalHPP += hpp

    const existing = byDay.get(date) ?? { revenue: 0, hpp: 0, profit: 0 }
    byDay.set(date, {
      revenue: existing.revenue + revenue,
      hpp: existing.hpp + hpp,
      profit: existing.profit + profit,
    })
  }

  // Tambahkan packingFee ke revenue (packing fee = revenue murni, HPP = 0)
  // Group packingFee by day dari transaksi yang sama
  const packingByDay = new Map<string, number>()
  let totalPackingFee = 0
  for (const item of items) {
    const date = format(item.transaction.transactionDate, "yyyy-MM-dd")
    const packing = Number(item.transaction.packingFee ?? 0)
    if (packing > 0) {
      // Hanya hitung sekali per transaksi (bukan per item)
      // Gunakan Set untuk track transactionId yang sudah dihitung
    }
    packingByDay.set(date, (packingByDay.get(date) ?? 0))
  }

  // Hitung packingFee per transaksi unik
  const uniqueTrxPacking = new Map<string, { date: string; packing: number }>()
  for (const item of items) {
    if (!uniqueTrxPacking.has(item.transactionId)) {
      uniqueTrxPacking.set(item.transactionId, {
        date: format(item.transaction.transactionDate, "yyyy-MM-dd"),
        packing: Number(item.transaction.packingFee ?? 0),
      })
    }
  }
  for (const { date, packing } of uniqueTrxPacking.values()) {
    if (packing > 0) {
      totalRevenue += packing
      totalPackingFee += packing
      const existing = byDay.get(date) ?? { revenue: 0, hpp: 0, profit: 0 }
      byDay.set(date, {
        revenue: existing.revenue + packing,
        hpp: existing.hpp,
        profit: existing.profit + packing,  // packing fee = pure profit
      })
    }
  }

  const totalProfit = totalRevenue - totalHPP
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  const data = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  return { totalRevenue, totalHPP, totalProfit, profitMargin, data }
}
