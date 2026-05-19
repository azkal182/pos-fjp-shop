import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { getDashboardData } from "@/features/dashboard/services/dashboard.service"

export const GET = withHandler(async () => {
  const data = await getDashboardData()
  return successResponse(data)
})
