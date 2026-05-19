import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import {
  updateVendor,
  softDeleteVendor,
} from "@/features/vendors/services/vendor.service"
import { updateVendorSchema } from "@/features/vendors/schemas"

export const PUT = withHandler(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const body = await req.json()
  const parsed = updateVendorSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
  const vendor = await updateVendor(id, parsed.data)
  return successResponse(vendor)
})

export const DELETE = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  await softDeleteVendor(id)
  return successResponse({ message: "Vendor berhasil dinonaktifkan" })
})
