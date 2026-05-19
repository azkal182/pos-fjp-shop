import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { getPurchaseById } from "@/features/purchases/services/purchase.service"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const purchase = await getPurchaseById(id)
  return successResponse(purchase)
})
