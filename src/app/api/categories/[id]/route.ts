import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import {
  updateCategory,
  deleteCategory,
} from "@/features/categories/services/category.service"
import { updateCategorySchema } from "@/features/categories/schemas"

export const PUT = withHandler(
  async (req: NextRequest, ctx) => {
    const { id } = await ctx.params!
    const body = await req.json()
    const parsed = updateCategorySchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message)
    }
    const category = await updateCategory(id, parsed.data)
    return successResponse(category)
  }
)

export const DELETE = withHandler(
  async (_req: NextRequest, ctx) => {
    const { id } = await ctx.params!
    await deleteCategory(id)
    return successResponse({ message: "Kategori berhasil dihapus" })
  }
)
