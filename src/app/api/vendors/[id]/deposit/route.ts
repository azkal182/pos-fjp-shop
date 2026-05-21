import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { getAvailableDeposit } from "@/features/deposits/services/deposit.service"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const result = await getAvailableDeposit("VENDOR", id)
  return successResponse(result)
})
