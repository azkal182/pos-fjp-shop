import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { detectPriceChanges } from "@/features/purchases/services/purchase.service"

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json()
  const items: { productId: string; buyPrice: number }[] = body.items ?? []
  const changes = await detectPriceChanges(items)
  return successResponse(changes)
})
