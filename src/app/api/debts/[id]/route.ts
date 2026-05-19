import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { NotFoundError } from "@/lib/exceptions"
import { prisma } from "@/lib/prisma"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!

  const debt = await prisma.debt.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      transaction: true,
      payments: {
        orderBy: { paymentDate: "desc" },
      },
    },
  })
  if (!debt) throw new NotFoundError("Hutang")
  return successResponse(debt)
})
