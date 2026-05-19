import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { getProductReport } from "@/features/reports/services/report.service"

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const dateFrom = sp.get("dateFrom") ?? undefined
  const dateTo = sp.get("dateTo") ?? undefined
  const categoryId = sp.get("categoryId") ?? undefined
  const data = await getProductReport(dateFrom, dateTo, categoryId)
  return successResponse(data)
})
