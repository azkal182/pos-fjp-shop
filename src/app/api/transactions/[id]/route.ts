import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { getTransactionById } from "@/features/transactions/services/transaction.service"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const transaction = await getTransactionById(id)
  return successResponse(transaction)
})
