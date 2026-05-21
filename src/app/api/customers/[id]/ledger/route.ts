import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { getLedger } from "@/features/ledger/services/ledger.service"

export const GET = withHandler(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const sp = req.nextUrl.searchParams
  const page = Number(sp.get("page") ?? 1)
  const limit = Number(sp.get("limit") ?? 50)

  const result = await getLedger("CUSTOMER", id, { page, limit })
  return successResponse(result)
})
