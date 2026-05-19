import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import {
  getProductById,
  updateProduct,
  softDeleteProduct,
} from "@/features/products/services/product.service"
import { updateProductSchema } from "@/features/products/schemas/product.schema"

export const GET = withHandler(
  async (_req: NextRequest, ctx) => {
    const { id } = await ctx.params!
    const product = await getProductById(id)
    return successResponse(product)
  }
)

export const PUT = withHandler(
  async (req: NextRequest, ctx) => {
    const { id } = await ctx.params!
    const body = await req.json()
    const parsed = updateProductSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message)
    }
    const product = await updateProduct(id, parsed.data)
    return successResponse(product)
  }
)

export const DELETE = withHandler(
  async (_req: NextRequest, ctx) => {
    const { id } = await ctx.params!
    await softDeleteProduct(id)
    return successResponse({ message: "Produk berhasil dinonaktifkan" })
  }
)
