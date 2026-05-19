import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { getCustomerPayments } from "@/features/debts/services/debt.service"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const payments = await getCustomerPayments(id)
  return successResponse(payments)
})
