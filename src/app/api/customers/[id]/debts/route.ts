import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { getCustomerDebtSummary } from "@/features/customers/services/customer.service"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const summary = await getCustomerDebtSummary(id)
  return successResponse(summary)
})
