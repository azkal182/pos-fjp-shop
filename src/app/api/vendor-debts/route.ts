import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { paginatedResponse } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { calculatePagination } from "@/lib/api-response"

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const vendorId = sp.get("vendorId") ?? undefined
  const status = sp.get("status") ?? undefined
  const page = Number(sp.get("page") ?? 1)
  const limit = Number(sp.get("limit") ?? 20)

  const where = {
    ...(vendorId && { vendorId }),
    ...(status ? { status: status as any } : { status: { in: ["UNPAID", "PARTIAL"] as any[] } }),
  }

  const [data, total] = await Promise.all([
    prisma.vendorDebt.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true, phone: true } },
        purchase: { select: { code: true } },
      },
      orderBy: [{ debtDate: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vendorDebt.count({ where }),
  ])

  return paginatedResponse(data, calculatePagination(page, limit, total))
})
