import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { getPartyProductMatrixReport } from "@/features/reports/services/report.service"
import type { PartyProductReportType } from "@/features/reports/types/report.types"

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const type = sp.get("type") as PartyProductReportType | null
  if (type !== "customer" && type !== "vendor") {
    throw new ValidationError("Tipe laporan harus customer atau vendor")
  }

  const data = await getPartyProductMatrixReport({
    type,
    partyId: sp.get("partyId") ?? undefined,
    dateFrom: sp.get("dateFrom") ?? undefined,
    dateTo: sp.get("dateTo") ?? undefined,
  })

  return successResponse(data)
})

