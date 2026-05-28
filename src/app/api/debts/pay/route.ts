import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError, NotFoundError } from "@/lib/exceptions"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import {
  allocatePaymentFifo,
  getTotalOutstanding,
} from "@/features/debts/services/debt.service"
import { createDeposit } from "@/features/deposits/services/deposit.service"
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

  const totalOutstanding = await getTotalOutstanding(customerId)
  const effectivePayment = Math.min(amount, totalOutstanding)
  const overpayAmount = Math.max(0, amount - totalOutstanding)

  const result = await prisma.$transaction(async (tx) => {
    let allocated = {
      allocations: [] as Array<{
        debtId: string
        debtCode: string
        debtDate: Date
        originalAmount: number
        currentRemaining: number
        allocatedAmount: number
        willBeFullyPaid: boolean
        remainingAfter: number
      }>,
      totalAllocated: 0,
      remainingChange: effectivePayment,
      customerPaymentId: null as string | null,
    }

    if (effectivePayment > 0) {
      // FIFO tetap prioritas utama jika masih ada hutang
      allocated = await allocatePaymentFifo(customerId, effectivePayment, undefined, notes, tx, userId)
    }

    if (overpayAmount > 0) {
      await createDeposit(
        "CUSTOMER",
        customerId,
        overpayAmount,
        "MANUAL",
        allocated.customerPaymentId,
        userId,
        "Kelebihan pembayaran hutang customer",
        tx
      )
    }

    return { ...allocated, overpayAmount, depositCreated: overpayAmount }
  })

  log.info("[DEBT]", "Manual debt payment processed", {
    customerId,
    customerName: customer.name,
    amount,
    totalOutstanding,
    effectivePayment,
    overpayAmount,
    allocationsCount: result.allocations.length,
    customerPaymentId: result.customerPaymentId,
  })

  return successResponse(result, 201)
})
