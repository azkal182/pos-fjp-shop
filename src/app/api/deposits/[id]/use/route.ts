import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { useDeposit } from "@/features/deposits/services/deposit.service"

const schema = z.object({
  amount: z.number().min(1),
  referenceType: z.string().min(1),
  referenceId: z.string().min(1),
})

export const POST = withHandler(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const session = await auth.api.getSession({ headers: req.headers })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)

  const result = await useDeposit(id, parsed.data.amount, parsed.data.referenceType, parsed.data.referenceId, session!.user.id)
  return successResponse(result)
})
