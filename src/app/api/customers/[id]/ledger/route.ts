import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { getCustomerLedger } from "@/features/debts/services/debt.service"

// GET /api/customers/:id/ledger
// Mengembalikan buku hutang customer: riwayat hutang + pembayaran dengan running balance
export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const result = await getCustomerLedger(id)
  return successResponse(result)
})
