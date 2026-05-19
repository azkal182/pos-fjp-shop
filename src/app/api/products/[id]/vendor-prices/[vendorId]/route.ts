import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { z } from "zod"
import {
  getVendorPriceForProductAndVendor,
  upsertVendorPrice,
  setPreferredVendor,
  deleteVendorPrice,
} from "@/features/products/services/product-vendor-price.service"

const updateSchema = z.object({
  buyPrice: z.number().min(0).optional(),
  isPreferred: z.boolean().optional(),
  notes: z.string().optional(),
})

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id: productId, vendorId } = await ctx.params!
  const price = await getVendorPriceForProductAndVendor(productId, vendorId)
  return successResponse(price)
})

export const PUT = withHandler(async (req: NextRequest, ctx) => {
  const { id: productId, vendorId } = await ctx.params!
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)

  if (parsed.data.isPreferred === true) {
    await setPreferredVendor(productId, vendorId)
  }

  if (parsed.data.buyPrice !== undefined) {
    const price = await upsertVendorPrice(productId, vendorId, parsed.data.buyPrice, parsed.data.isPreferred, parsed.data.notes)
    return successResponse(price)
  }

  return successResponse({ message: "Updated" })
})

export const DELETE = withHandler(async (_req: NextRequest, ctx) => {
  const { id: productId, vendorId } = await ctx.params!
  await deleteVendorPrice(productId, vendorId)
  return successResponse({ message: "Relasi produk-vendor dihapus" })
})
