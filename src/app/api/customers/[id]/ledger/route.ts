import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { getCustomerLedger } from "@/features/debts/services/debt.service"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const ledger = await getCustomerLedger(id)
  return successResponse(ledger)
})
