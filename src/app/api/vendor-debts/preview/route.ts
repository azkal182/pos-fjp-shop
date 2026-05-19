import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { previewFifoAllocation } from "@/features/vendors/services/vendor-debt.service"

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json()
  const { vendorId, amount } = body
  if (!vendorId || typeof amount !== "number" || amount <= 0) {
    throw new ValidationError("vendorId dan amount wajib diisi")
  }
  const preview = await previewFifoAllocation(vendorId, amount)
  return successResponse(preview)
})
