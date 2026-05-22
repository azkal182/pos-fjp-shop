import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError, NotFoundError, ConflictError } from "@/lib/exceptions"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import {
  allocatePaymentFifo,
  hasOutstandingDebt,
  getTotalOutstanding,
} from "@/features/debts/services/debt.service"
import { debtPaymentSchema } from "@/features/debts/schemas/debt.schema"
import { log } from "@/lib/logger"

export const POST = withHandler(async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: req.headers })
  const userId = session!.user.id

  const body = await req.json()
  const parsed = debtPaymentSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)

  const { customerId, amount, notes } = parsed.data

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, isActive: true },
  })
  if (!customer) throw new NotFoundError("Customer")

  const hasDebt = await hasOutstandingDebt(customerId)
  if (!hasDebt) throw new ConflictError("Customer tidak memiliki hutang outstanding")

  // Validasi nominal tidak melebihi total hutang
  const totalOutstanding = await getTotalOutstanding(customerId)
  if (amount > totalOutstanding) {
    throw new ValidationError(
      `Nominal melebihi total hutang. Maksimal: Rp ${totalOutstanding.toLocaleString("id-ID")}`
    )
  }

  // Pass userId sebagai createdBy agar ledger entry PAYMENT_IN ditulis
  const result = await allocatePaymentFifo(customerId, amount, undefined, notes, undefined, userId)

  log.info("[DEBT]", "Manual debt payment processed", {
    customerId,
    customerName: customer.name,
    amount,
    totalOutstanding,
    allocationsCount: result.allocations.length,
    customerPaymentId: result.customerPaymentId,
  })

  return successResponse(result, 201)
})
