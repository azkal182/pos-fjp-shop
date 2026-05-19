import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import {
  getCustomerById,
  updateCustomer,
  softDeleteCustomer,
} from "@/features/customers/services/customer.service"
import { updateCustomerSchema } from "@/features/customers/schemas/customer.schema"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const customer = await getCustomerById(id)
  return successResponse(customer)
})

export const PUT = withHandler(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const body = await req.json()
  const parsed = updateCustomerSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
  const customer = await updateCustomer(id, parsed.data)
  return successResponse(customer)
})

export const DELETE = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  await softDeleteCustomer(id)
  return successResponse({ message: "Customer berhasil dinonaktifkan" })
})
