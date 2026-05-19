import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const payments = await prisma.vendorPayment.findMany({
    where: { vendorId: id },
    include: {
      allocations: {
        include: {
          debt: { select: { purchase: { select: { code: true } } } },
        },
      },
    },
    orderBy: { paymentDate: "desc" },
  })
  return successResponse(payments)
})
