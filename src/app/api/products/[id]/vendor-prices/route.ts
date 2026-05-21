import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { z } from "zod"
import {
  getVendorPricesForProduct,
  upsertVendorPrice,
} from "@/features/products/services/product-vendor-price.service"

const upsertSchema = z.object({
  vendorId: z.string().min(1, "Vendor wajib dipilih"),
  buyPrice: z.number().min(0, "Harga beli tidak boleh negatif"),
  isPreferred: z.boolean().optional(),
  notes: z.string().optional(),
})

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const prices = await getVendorPricesForProduct(id)
  return successResponse(prices)
})

export const POST = withHandler(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const body = await req.json()
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)

  const price = await upsertVendorPrice(
    id,
    parsed.data.vendorId,
    parsed.data.buyPrice,
    parsed.data.isPreferred,
    parsed.data.notes
  )
  return successResponse(price, 201)
})
