import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { auth } from "@/lib/auth"
import { z } from "zod"
import {
  allocatePaymentFifo,
  allocatePaymentToInvoice,
} from "@/features/vendors/services/vendor-debt.service"

const paySchema = z.object({
  vendorId: z.string().min(1),
  amount: z.number().min(1),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  mode: z.enum(["fifo", "invoice"]),
  vendorDebtId: z.string().optional(), // required jika mode=invoice
  notes: z.string().optional(),
})

export const POST = withHandler(async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: req.headers })
  const userId = session!.user.id

  const body = await req.json()
  const parsed = paySchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)

  const { vendorId, amount, paymentMethod, mode, vendorDebtId, notes } = parsed.data

  if (mode === "invoice") {
    if (!vendorDebtId) throw new ValidationError("vendorDebtId wajib diisi untuk mode invoice")
    const result = await allocatePaymentToInvoice(vendorDebtId, amount, paymentMethod, userId, notes)
    return successResponse(result, 201)
  }

  const result = await allocatePaymentFifo(vendorId, amount, paymentMethod, userId, notes)
  return successResponse(result, 201)
})
