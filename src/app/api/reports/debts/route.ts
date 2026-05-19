import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { getDebtReport } from "@/features/reports/services/report.service"

export const GET = withHandler(async () => {
  const data = await getDebtReport()
  return successResponse(data)
})
