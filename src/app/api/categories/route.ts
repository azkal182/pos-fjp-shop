import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import {
  getAllCategories,
  createCategory,
} from "@/features/categories/services/category.service"
import { createCategorySchema } from "@/features/categories/schemas"

export const GET = withHandler(async () => {
  const categories = await getAllCategories()
  return successResponse(categories)
})

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json()
  const parsed = createCategorySchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message)
  }
  const category = await createCategory(parsed.data)
  return successResponse(category, 201)
})
