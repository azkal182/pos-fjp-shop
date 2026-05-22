import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { cancelDraft } from "@/features/pos/services/pos.service"

export const POST = withHandler(async (_req: NextRequest, ctx) => {
  const session = await auth.api.getSession({ headers: _req.headers })
  const userId = session!.user.id

  const { id } = await ctx.params!
  const result = await cancelDraft(id, userId)
  return successResponse(result)
})
