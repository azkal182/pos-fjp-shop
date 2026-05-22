import { prisma } from "@/lib/prisma"
import { format, startOfWeek, subDays } from "date-fns"
import { startOfDayWIB, endOfDayWIB, formatDateWIB, parseDateWIB } from "@/lib/timezone"
import { getAgingCategories } from "@/features/debts/services/debt-aging.service"
import { classifyDebtClient } from "@/features/debts/utils/aging.utils"
import type { SalesReport, ProductReportItem, DebtReport, ProfitReport } from "../types/report.types"

function parseDate(d?: string): Date | undefined {
  return d ? parseDateWIB(d) : undefined
}

// ─── Sales Report ─────────────────────────────────────────────────────────────
// Opsi C: Accrual (nilai penjualan) + Cash Basis (kas masuk)

export async function getSalesReport(
  dateFrom?: string,
  dateTo?: string,
  groupBy: "day" | "week" | "month" = "day"
): Promise<SalesReport> {
  const from = parseDate(dateFrom) ?? subDays(new Date(), 29)
  const to = parseDate(dateTo) ?? new Date()

  // 1. Semua transaksi CONFIRMED dalam periode (Accrual)
  const transactions = await prisma.transaction.findMany({
    where: {
      confirmationStatus: "CONFIRMED",
      transactionDate: { gte: startOfDayWIB(from), lte: endOfDayWIB(to) },
    },
    select: {
      totalAmount: true,
      paidAmount: true,
      debtAmount: true,
      paymentStatus: true,
      transactionDate: true,
    },
    orderBy: { transactionDate: "asc" },
  })

  // 2. Pembayaran hutang yang diterima dalam periode (Cash Basis tambahan)
  const debtPayments = await prisma.customerPayment.findMany({
    where: {
      paymentDate: { gte: startOfDayWIB(from), lte: endOfDayWIB(to) },
      source: "DIRECT",  // hanya pembayaran manual, bukan dari POS overpay
    },
    select: { amount: true, paymentDate: true },
  })

  // Group by period
  const grouped = new Map<string, {
    revenue: number; count: number; cashCollected: number; newDebt: number
  }>()

  function getKey(date: Date): string {
    if (groupBy === "month") return formatDateWIB(date).slice(0, 7) // YYYY-MM
    if (groupBy === "week") return formatDateWIB(startOfWeek(date, { weekStartsOn: 1 }))
    return formatDateWIB(date)
  }

  for (const trx of transactions) {
    const key = getKey(trx.transactionDate)
    const existing = grouped.get(key) ?? { revenue: 0, count: 0, cashCollected: 0, newDebt: 0 }
    grouped.set(key, {
      revenue: existing.revenue + Number(trx.totalAmount),
      count: existing.count + 1,
      // Kas masuk dari transaksi ini = paidAmount (uang tunai saat transaksi)
      cashCollected: existing.cashCollected + Number(trx.paidAmount),
      // Piutang baru = debtAmount
      newDebt: existing.newDebt + Number(trx.debtAmount),
    })
  }

  // Tambahkan pembayaran hutang ke cashCollected per hari
  for (const payment of debtPayments) {
    const key = getKey(payment.paymentDate)
    const existing = grouped.get(key) ?? { revenue: 0, count: 0, cashCollected: 0, newDebt: 0 }
    grouped.set(key, {
      ...existing,
      cashCollected: existing.cashCollected + Number(payment.amount),
    })
  }

  const data = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      totalRevenue: v.revenue,
      transactionCount: v.count,
      cashCollected: v.cashCollected,
      newDebt: v.newDebt,
    }))

  const totalRevenue = transactions.reduce((s, t) => s + Number(t.totalAmount), 0)
  const totalTransactions = transactions.length
  const totalCashFromTrx = transactions.reduce((s, t) => s + Number(t.paidAmount), 0)
  const totalDebtPaymentsReceived = debtPayments.reduce((s, p) => s + Number(p.amount), 0)
  const totalCashCollected = totalCashFromTrx + totalDebtPaymentsReceived
  const totalNewDebt = transactions.reduce((s, t) => s + Number(t.debtAmount), 0)

  // Periode sebelumnya untuk perbandingan (accrual)
  const periodMs = to.getTime() - from.getTime()
  const prevFrom = new Date(from.getTime() - periodMs)
  const prevTo = new Date(from.getTime() - 1)

  const prevTrx = await prisma.transaction.aggregate({
    where: {
      confirmationStatus: "CONFIRMED",
      transactionDate: { gte: startOfDayWIB(prevFrom), lte: endOfDayWIB(prevTo) },
    },
    _sum: { totalAmount: true },
  })
  const comparisonRevenue = Number(prevTrx._sum.totalAmount ?? 0)
  const revenueChange =
    comparisonRevenue > 0
      ? ((totalRevenue - comparisonRevenue) / comparisonRevenue) * 100
      : totalRevenue > 0 ? 100 : 0

  return {
    data,
    totalRevenue,
    totalTransactions,
    comparisonRevenue,
    revenueChange,
    totalCashCollected,
    totalNewDebt,
    totalDebtPaymentsReceived,
  }
}

// ─── Product Report ───────────────────────────────────────────────────────────
// Accrual: semua transaksi CONFIRMED (termasuk hutang)

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
        transactionDate: { gte: startOfDayWIB(from), lte: endOfDayWIB(to) },
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
// Opsi C: Accrual profit + Cash profit

export async function getProfitReport(
  dateFrom?: string,
  dateTo?: string
): Promise<ProfitReport> {
  const from = parseDate(dateFrom) ?? subDays(new Date(), 29)
  const to = parseDate(dateTo) ?? new Date()

  // Semua transaksi CONFIRMED (Accrual)
  const transactions = await prisma.transaction.findMany({
    where: {
      confirmationStatus: "CONFIRMED",
      transactionDate: { gte: startOfDayWIB(from), lte: endOfDayWIB(to) },
    },
    select: {
      id: true,
      transactionDate: true,
      paidAmount: true,
      debtAmount: true,
      packingFee: true,
    },
  })

  const transactionIds = transactions.map((t) => t.id)
  const trxMap = new Map(transactions.map((t) => [t.id, t]))

  // Items dari semua transaksi tersebut
  const items = await prisma.transactionItem.findMany({
    where: { transactionId: { in: transactionIds } },
    select: {
      transactionId: true,
      quantity: true,
      sellPrice: true,
      buyPrice: true,
      discountAmount: true,
    },
  })

  // Pembayaran hutang yang diterima dalam periode
  const debtPayments = await prisma.customerPayment.findMany({
    where: {
      paymentDate: { gte: startOfDayWIB(from), lte: endOfDayWIB(to) },
      source: "DIRECT",
    },
    select: { amount: true, paymentDate: true },
  })

  const byDay = new Map<string, {
    revenue: number; cashRevenue: number; hpp: number; profit: number; cashProfit: number
  }>()

  let totalRevenue = 0
  let totalHPP = 0
  let totalNewDebt = 0

  // Hitung per item
  for (const item of items) {
    const trx = trxMap.get(item.transactionId)
    if (!trx) continue

    const date = formatDateWIB(trx.transactionDate)
    const qty = item.quantity
    const revenue = Number(item.sellPrice) * qty - Number(item.discountAmount) * qty
    const hpp = Number(item.buyPrice) * qty

    totalRevenue += revenue
    totalHPP += hpp

    const existing = byDay.get(date) ?? { revenue: 0, cashRevenue: 0, hpp: 0, profit: 0, cashProfit: 0 }
    byDay.set(date, {
      ...existing,
      revenue: existing.revenue + revenue,
      hpp: existing.hpp + hpp,
      profit: existing.profit + (revenue - hpp),
    })
  }

  // Hitung packing fee per transaksi unik (accrual)
  const processedTrx = new Set<string>()
  for (const item of items) {
    if (processedTrx.has(item.transactionId)) continue
    processedTrx.add(item.transactionId)

    const trx = trxMap.get(item.transactionId)
    if (!trx) continue

    const packing = Number(trx.packingFee ?? 0)
    const date = formatDateWIB(trx.transactionDate)
    totalNewDebt += Number(trx.debtAmount)

    if (packing > 0) {
      totalRevenue += packing
      const existing = byDay.get(date) ?? { revenue: 0, cashRevenue: 0, hpp: 0, profit: 0, cashProfit: 0 }
      byDay.set(date, {
        ...existing,
        revenue: existing.revenue + packing,
        profit: existing.profit + packing,
      })
    }

    // Cash revenue per transaksi = paidAmount + packing (jika lunas)
    const cashFromTrx = Number(trx.paidAmount)
    if (cashFromTrx > 0) {
      const existing = byDay.get(date) ?? { revenue: 0, cashRevenue: 0, hpp: 0, profit: 0, cashProfit: 0 }
      byDay.set(date, {
        ...existing,
        cashRevenue: existing.cashRevenue + cashFromTrx,
      })
    }
  }

  // Tambahkan pembayaran hutang ke cashRevenue per hari
  let totalDebtPaymentsReceived = 0
  for (const payment of debtPayments) {
    const date = formatDateWIB(payment.paymentDate)
    const amount = Number(payment.amount)
    totalDebtPaymentsReceived += amount
    const existing = byDay.get(date) ?? { revenue: 0, cashRevenue: 0, hpp: 0, profit: 0, cashProfit: 0 }
    byDay.set(date, {
      ...existing,
      cashRevenue: existing.cashRevenue + amount,
    })
  }

  // Hitung cashProfit = cashRevenue - (hpp * cashRevenue/revenue) — proporsional
  // Lebih sederhana: cashProfit = cashRevenue - totalHPP * (cashRevenue/totalRevenue)
  const totalCashRevenue = Array.from(byDay.values()).reduce((s, v) => s + v.cashRevenue, 0)

  // Update cashProfit per hari
  for (const [date, v] of byDay.entries()) {
    const cashProfitRatio = totalRevenue > 0 ? v.cashRevenue / totalRevenue : 0
    byDay.set(date, {
      ...v,
      cashProfit: v.cashRevenue - (totalHPP * cashProfitRatio),
    })
  }

  const totalProfit = totalRevenue - totalHPP
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
  const totalCashProfit = totalCashRevenue - totalHPP * (totalRevenue > 0 ? totalCashRevenue / totalRevenue : 0)
  const cashProfitMargin = totalCashRevenue > 0 ? (totalCashProfit / totalCashRevenue) * 100 : 0

  const data = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  return {
    totalRevenue,
    totalHPP,
    totalProfit,
    profitMargin,
    totalCashRevenue,
    totalCashProfit,
    cashProfitMargin,
    totalNewDebt,
    totalDebtPaymentsReceived,
    data,
  }
}
