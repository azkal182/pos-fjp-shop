import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { getLedger } from "@/features/ledger/services/ledger.service"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const result = await getLedger("VENDOR", id)
  return successResponse(result)
})
