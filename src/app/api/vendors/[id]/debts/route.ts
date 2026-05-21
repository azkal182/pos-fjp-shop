import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { getVendorDebtSummary } from "@/features/vendors/services/vendor-debt.service"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const summary = await getVendorDebtSummary(id)
  return successResponse(summary)
})
