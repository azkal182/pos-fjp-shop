import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { paginatedResponse, successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { getAllCustomers, createCustomer } from "@/features/customers/services/customer.service"
import { createCustomerSchema } from "@/features/customers/schemas/customer.schema"

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const search = sp.get("search") ?? undefined
  const isActiveParam = sp.get("isActive")
  const isActive =
    isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined
  const page = Number(sp.get("page") ?? 1)
  const limit = Number(sp.get("limit") ?? 20)

  const { data, meta } = await getAllCustomers({ search, isActive, page, limit })
  return paginatedResponse(data, meta)
})

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json()
  const parsed = createCustomerSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
  const customer = await createCustomer(parsed.data)
  return successResponse(customer, 201)
})
