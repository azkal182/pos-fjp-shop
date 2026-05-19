import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError, ConflictError, NotFoundError } from "@/lib/exceptions"
import { prisma } from "@/lib/prisma"
import { updateAgingCategorySchema } from "@/features/debts/schemas/debt.schema"

export const PUT = withHandler(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const body = await req.json()
  const parsed = updateAgingCategorySchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)

  const existing = await prisma.debtAgingCategory.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Kategori aging")

  const category = await prisma.debtAgingCategory.update({
    where: { id },
    data: parsed.data,
  })
  return successResponse(category)
})

export const DELETE = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!

  const existing = await prisma.debtAgingCategory.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Kategori aging")

  const count = await prisma.debtAgingCategory.count()
  if (count <= 1) {
    throw new ConflictError("Minimal harus ada 1 kategori aging")
  }

  await prisma.debtAgingCategory.delete({ where: { id } })
  return successResponse({ message: "Kategori aging berhasil dihapus" })
})
