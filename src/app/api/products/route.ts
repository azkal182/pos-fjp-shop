import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse, paginatedResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import {
  getAllProducts,
  createProduct,
} from "@/features/products/services/product.service"
import { createProductSchema } from "@/features/products/schemas/product.schema"

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const page = Number(sp.get("page") ?? 1)
  const limit = Number(sp.get("limit") ?? 20)
  const search = sp.get("search") ?? undefined
  const categoryId = sp.get("categoryId") ?? undefined
  const isActiveParam = sp.get("isActive")
  const isActive =
    isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined
  const lowStock = sp.get("lowStock") === "true"

  const { data, meta } = await getAllProducts({
    search,
    categoryId,
    isActive,
    lowStock,
    page,
    limit,
  })
  return paginatedResponse(data, meta)
})

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json()
  const parsed = createProductSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message)
  }
  const product = await createProduct(parsed.data)
  return successResponse(product, 201)
})
