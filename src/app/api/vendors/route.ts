import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { getAllVendors, createVendor } from "@/features/vendors/services/vendor.service"
import { createVendorSchema } from "@/features/vendors/schemas"

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const search = sp.get("search") ?? undefined
  const isActiveParam = sp.get("isActive")
  const isActive =
    isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined

  const vendors = await getAllVendors({ search, isActive })
  return successResponse(vendors)
})

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json()
  const parsed = createVendorSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)
  const vendor = await createVendor(parsed.data)
  return successResponse(vendor, 201)
})
