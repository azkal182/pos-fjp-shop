import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { prisma } from "@/lib/prisma"
import { createAgingCategorySchema } from "@/features/debts/schemas/debt.schema"

export const GET = withHandler(async () => {
  const categories = await prisma.debtAgingCategory.findMany({
    orderBy: { order: "asc" },
  })
  return successResponse(categories)
})

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json()
  const parsed = createAgingCategorySchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)

  const category = await prisma.debtAgingCategory.create({ data: parsed.data })
  return successResponse(category, 201)
})
