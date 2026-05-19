import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { auth } from "@/lib/auth"
import { getUserById, updateUser, deleteUser } from "@/features/users/services/user.service"
import { updateUserSchema } from "@/features/users/schemas/user.schema"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const user = await getUserById(id)
  return successResponse(user)
})

export const PUT = withHandler(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const body = await req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
  const user = await updateUser(id, parsed.data)
  return successResponse(user)
})

export const DELETE = withHandler(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const session = await auth.api.getSession({ headers: req.headers })
  await deleteUser(id, session!.user.id)
  return successResponse({ message: "User berhasil dihapus" })
})
