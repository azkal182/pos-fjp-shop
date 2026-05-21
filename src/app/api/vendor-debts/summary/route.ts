import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/vendor-debts/summary
 * Mengembalikan semua vendor beserta status hutang & deposit masing-masing.
 * Digunakan untuk halaman /vendor-debts.
 */
export const GET = withHandler(async (_req: NextRequest) => {
  // Ambil semua vendor aktif
  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    select: { id: true, name: true, phone: true, address: true },
    orderBy: { name: "asc" },
  })

  if (vendors.length === 0) {
    return successResponse({ vendors: [], grandTotal: 0, vendorCount: 0 })
  }

  const vendorIds = vendors.map((v) => v.id)

  // Ambil hutang outstanding per vendor
  const debts = await prisma.vendorDebt.findMany({
    where: { vendorId: { in: vendorIds }, status: { in: ["UNPAID", "PARTIAL"] } },
    select: {
      vendorId: true,
      remainingAmount: true,
      debtDate: true,
    },
    orderBy: { debtDate: "asc" },
  })

  // Ambil deposit per vendor
  const deposits = await prisma.deposit.findMany({
    where: { partyType: "VENDOR", partyId: { in: vendorIds }, balance: { gt: 0 } },
    select: { partyId: true, balance: true },
  })

  // Build maps
  const debtMap = new Map<string, { totalOutstanding: number; activeDebtsCount: number; oldestDays: number }>()
  const now = Date.now()

  for (const debt of debts) {
    const days = Math.floor((now - new Date(debt.debtDate).getTime()) / 86400000)
    const existing = debtMap.get(debt.vendorId)
    if (existing) {
      existing.totalOutstanding += Number(debt.remainingAmount)
      existing.activeDebtsCount += 1
      if (days > existing.oldestDays) existing.oldestDays = days
    } else {
      debtMap.set(debt.vendorId, {
        totalOutstanding: Number(debt.remainingAmount),
        activeDebtsCount: 1,
        oldestDays: days,
      })
    }
  }

  const depositMap = new Map<string, number>()
  for (const dep of deposits) {
    depositMap.set(dep.partyId, (depositMap.get(dep.partyId) ?? 0) + Number(dep.balance))
  }

  // Gabungkan
  const result = vendors.map((vendor) => {
    const debt = debtMap.get(vendor.id)
    const depositBalance = depositMap.get(vendor.id) ?? 0
    return {
      vendor,
      totalOutstanding: debt?.totalOutstanding ?? 0,
      activeDebtsCount: debt?.activeDebtsCount ?? 0,
      oldestDays: debt?.oldestDays ?? 0,
      depositBalance,
      hasDebt: !!debt,
      hasDeposit: depositBalance > 0,
    }
  })

  // Sort: yang punya hutang dulu (terbesar), lalu yang punya deposit, lalu sisanya
  result.sort((a, b) => {
    if (a.hasDebt && !b.hasDebt) return -1
    if (!a.hasDebt && b.hasDebt) return 1
    if (a.hasDebt && b.hasDebt) return b.totalOutstanding - a.totalOutstanding
    if (a.hasDeposit && !b.hasDeposit) return -1
    if (!a.hasDeposit && b.hasDeposit) return 1
    return a.vendor.name.localeCompare(b.vendor.name)
  })

  const grandTotal = result.reduce((s, v) => s + v.totalOutstanding, 0)
  const vendorCount = result.filter((v) => v.hasDebt).length

  return successResponse({ vendors: result, grandTotal, vendorCount })
})
