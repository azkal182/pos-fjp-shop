import React from "react"
import { type NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { withHandler } from "@/lib/api-handler"
import { getCustomerProductHistoryReport } from "@/features/customers/services/customer.service"
import { CustomerProductHistoryPdf } from "@/features/customers/pdf/CustomerProductHistoryPdf"
import { getStoreSettings } from "@/features/settings/services/settings.service"

export const runtime = "nodejs"

export const GET = withHandler(async (req: NextRequest, ctx) => {
  const params = await ctx.params
  const customerId = params?.id
  if (!customerId) {
    return NextResponse.json({ success: false, error: "Customer tidak ditemukan" }, { status: 404 })
  }

  const sp = req.nextUrl.searchParams
  const [report, storeSettings] = await Promise.all([
    getCustomerProductHistoryReport({
      customerId,
      dateFrom: sp.get("dateFrom") ?? undefined,
      dateTo: sp.get("dateTo") ?? undefined,
    }),
    getStoreSettings(),
  ])

  const document = React.createElement(CustomerProductHistoryPdf, {
    report,
    storeName: storeSettings.storeName,
    storeAddress: storeSettings.storeAddress,
    storePhone: storeSettings.storePhone,
    logoUrl: storeSettings.logoUrl || undefined,
  }) as Parameters<typeof renderToBuffer>[0]
  const buffer = await renderToBuffer(document)
  const safeName = report.customer.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  const filename = `riwayat-belanja-${safeName || "customer"}-${report.dateFrom}-${report.dateTo}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
})
