import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { auth } from "@/lib/auth"
import { confirmTransaction } from "@/features/pos/services/pos.service"
import { confirmTransactionSchema } from "@/features/pos/schemas/pos.schema"

export const POST = withHandler(async (req: NextRequest, ctx) => {
  const session = await auth.api.getSession({ headers: req.headers })
  const userId = session!.user.id

  const { id } = await ctx.params!
  const body = await req.json()
  const parsed = confirmTransactionSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)

  const result = await confirmTransaction(id, parsed.data, userId)
  return successResponse(result)
})
