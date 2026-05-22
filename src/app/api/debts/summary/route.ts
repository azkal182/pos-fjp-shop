import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { paginatedResponse } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { calculatePagination } from "@/lib/api-response"

/**
 * GET /api/debts/summary
 * Ringkasan hutang per customer dengan pagination.
 * Digunakan untuk tab "Ringkasan per Customer" di halaman /debts.
 */
export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const page = Number(sp.get("page") ?? 1)
  const limit = Number(sp.get("limit") ?? 20)
  const search = sp.get("search") ?? undefined

  // Ambil semua customer yang punya hutang aktif
  const where = {
    status: { in: ["UNPAID", "PARTIAL"] as any[] },
    ...(search && {
      customer: {
        name: { contains: search, mode: "insensitive" as any },
      },
    }),
  }

  // Group by customerId — hitung total per customer
  const grouped = await prisma.debt.groupBy({
    by: ["customerId"],
    where,
    _sum: { remainingAmount: true },
    _count: { id: true },
    orderBy: { _sum: { remainingAmount: "desc" } },
    skip: (page - 1) * limit,
    take: limit,
  })

  const total = await prisma.debt.groupBy({
    by: ["customerId"],
    where,
  }).then((r) => r.length)

  // Fetch nama customer
  const customerIds = grouped.map((g) => g.customerId)
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, phone: true },
  })
  const customerMap = new Map(customers.map((c) => [c.id, c]))

  const data = grouped.map((g) => ({
    customerId: g.customerId,
    name: customerMap.get(g.customerId)?.name ?? "Unknown",
    phone: customerMap.get(g.customerId)?.phone ?? null,
    totalRemaining: Number(g._sum.remainingAmount ?? 0),
    debtCount: g._count.id,
  }))

  return paginatedResponse(data, calculatePagination(page, limit, total))
})
