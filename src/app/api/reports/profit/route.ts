import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { getProfitReport } from "@/features/reports/services/report.service"

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const dateFrom = sp.get("dateFrom") ?? undefined
  const dateTo = sp.get("dateTo") ?? undefined
  const data = await getProfitReport(dateFrom, dateTo)
  return successResponse(data)
})
