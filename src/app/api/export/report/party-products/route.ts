import React from "react"
import { type NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { withHandler } from "@/lib/api-handler"
import { ValidationError } from "@/lib/exceptions"
import { getPartyProductMatrixReport } from "@/features/reports/services/report.service"
import { getStoreSettings } from "@/features/settings/services/settings.service"
import {
  PartyProductReportPDF,
  getPartyProductPdfOrientation,
} from "@/features/reports/pdf/PartyProductReportPDF"
import type { PartyProductReportType } from "@/features/reports/types/report.types"

export const runtime = "nodejs"

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const type = sp.get("type") as PartyProductReportType | null
  if (type !== "customer" && type !== "vendor") {
    throw new ValidationError("Tipe laporan harus customer atau vendor")
  }

  const [report, storeSettings] = await Promise.all([
    getPartyProductMatrixReport({
      type,
      partyId: sp.get("partyId") ?? undefined,
      dateFrom: sp.get("dateFrom") ?? undefined,
      dateTo: sp.get("dateTo") ?? undefined,
    }),
    getStoreSettings(),
  ])

  const orientation = getPartyProductPdfOrientation(report)
  const document = React.createElement(PartyProductReportPDF, {
    report,
    storeName: storeSettings.storeName,
    storeAddress: storeSettings.storeAddress,
    storePhone: storeSettings.storePhone,
    logoUrl: storeSettings.logoUrl || undefined,
  }) as Parameters<typeof renderToBuffer>[0]
  const buffer = await renderToBuffer(document)
  const filename = `rekap-produk-${type}-${report.dateFrom}-${report.dateTo}-${orientation}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
})
