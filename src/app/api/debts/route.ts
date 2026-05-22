import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { paginatedResponse } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { calculatePagination } from "@/lib/api-response"
import { classifyDebts } from "@/features/debts/services/debt-aging.service"

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const customerId = sp.get("customerId") ?? undefined
  const status = sp.get("status") ?? undefined
  const page = Number(sp.get("page") ?? 1)
  const limit = Number(sp.get("limit") ?? 20)

  const where = {
    ...(customerId && { customerId }),
    ...(status && { status: status as any }),
    // Default: hanya tampilkan yang belum lunas
    ...(!status && { status: { in: ["UNPAID", "PARTIAL"] as any[] } }),
  }

  const [debts, total] = await Promise.all([
    prisma.debt.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        transaction: { select: { id: true, code: true } },
      },
      orderBy: { debtDate: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.debt.count({ where }),
  ])

  const debtsWithAging = await classifyDebts(debts)
  const meta = calculatePagination(page, limit, total)

  return paginatedResponse(debtsWithAging, meta)
})
