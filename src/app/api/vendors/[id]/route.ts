import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { NotFoundError } from "@/lib/exceptions"
import { prisma } from "@/lib/prisma"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      _count: { select: { purchases: true } },
    },
  })
  if (!vendor) throw new NotFoundError("Vendor")
  return successResponse(vendor)
})
