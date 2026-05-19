import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { paginatedResponse } from "@/lib/api-response"
import { getAllStockMovements } from "@/features/stock-movements/services/stock-movement.service"
import type { StockMovementType } from "@/generated/prisma"

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const productId = sp.get("productId") ?? undefined
  const productSearch = sp.get("search") ?? undefined
  const type = (sp.get("type") ?? undefined) as StockMovementType | undefined
  const dateFrom = sp.get("dateFrom") ?? undefined
  const dateTo = sp.get("dateTo") ?? undefined
  const page = Number(sp.get("page") ?? 1)
  const limit = Number(sp.get("limit") ?? 20)

  const { data, meta } = await getAllStockMovements({ productId, productSearch, type, dateFrom, dateTo, page, limit })
  return paginatedResponse(data, meta)
})
