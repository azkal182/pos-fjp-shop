import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { previewFifoAllocation } from "@/features/debts/services/debt.service"

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json()
  const { customerId, amount } = body

  if (!customerId || typeof amount !== "number" || amount <= 0) {
    throw new ValidationError("customerId dan amount wajib diisi")
  }

  const preview = await previewFifoAllocation(customerId, amount)
  return successResponse(preview)
})
