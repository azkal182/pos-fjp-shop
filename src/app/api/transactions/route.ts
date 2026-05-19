import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { paginatedResponse, successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { auth } from "@/lib/auth"
import { getAllTransactions } from "@/features/transactions/services/transaction.service"
import { processCheckout } from "@/features/pos/services/pos.service"
import { checkoutSchema } from "@/features/pos/schemas/pos.schema"

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const customerId = sp.get("customerId") ?? undefined
  const paymentStatus = sp.get("paymentStatus") ?? undefined
  const dateFrom = sp.get("dateFrom") ?? undefined
  const dateTo = sp.get("dateTo") ?? undefined
  const page = Number(sp.get("page") ?? 1)
  const limit = Number(sp.get("limit") ?? 20)

  const { data, meta } = await getAllTransactions({ customerId, paymentStatus, dateFrom, dateTo, page, limit })
  return paginatedResponse(data, meta)
})

export const POST = withHandler(async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: req.headers })
  const userId = session!.user.id

  const body = await req.json()
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)

  const transaction = await processCheckout(parsed.data, userId)
  return successResponse(transaction, 201)
})
