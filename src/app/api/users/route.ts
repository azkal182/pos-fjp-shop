import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { getAllUsers, createUser } from "@/features/users/services/user.service"
import { createUserSchema } from "@/features/users/schemas/user.schema"

export const GET = withHandler(async () => {
  const users = await getAllUsers()
  return successResponse(users)
})

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
  const user = await createUser(parsed.data)
  return successResponse(user, 201)
})
