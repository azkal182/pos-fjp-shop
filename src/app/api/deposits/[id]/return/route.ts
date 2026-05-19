import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { returnDeposit } from "@/features/deposits/services/deposit.service"

const schema = z.object({
  amount: z.number().min(1),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  notes: z.string().optional(),
})

export const POST = withHandler(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const session = await auth.api.getSession({ headers: req.headers })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)

  await returnDeposit(id, parsed.data.amount, parsed.data.paymentMethod, session!.user.id, parsed.data.notes)
  return successResponse({ message: "Deposit berhasil dikembalikan" })
})
