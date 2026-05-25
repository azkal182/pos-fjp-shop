import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { NotFoundError, ValidationError } from "@/lib/exceptions"
import { prisma } from "@/lib/prisma"
import { updateVendorSchema } from "@/features/vendors/schemas"
import { updateVendor } from "@/features/vendors/services/vendor.service"

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

export const PUT = withHandler(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const body = await req.json()
  const parsed = updateVendorSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
  const vendor = await updateVendor(id, parsed.data)
  return successResponse(vendor)
})
