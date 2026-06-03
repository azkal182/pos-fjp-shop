import { Document, Page, Text, View } from "@react-pdf/renderer"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { COLORS, PDF_PAGE_SIZE_F4, formatRp, shared } from "@/lib/pdf/styles"
import { PdfFooter } from "@/lib/pdf/PdfFooter"
import { PdfHeader } from "@/lib/pdf/PdfHeader"
import type { PartyProductMatrixReport, PartyProductMatrixRow } from "../types/report.types"

interface PartyProductReportPdfProps {
  report: PartyProductMatrixReport
  storeName: string
  storeAddress?: string
  storePhone?: string
  logoUrl?: string
}

function formatNumber(value: number): string {
  return value === 0 ? "—" : value.toLocaleString("id-ID")
}

function dateLabel(date: string): string {
  return String(Number(date.slice(-2)))
}

function formatPeriod(dateFrom: string, dateTo: string): string {
  try {
    return `${format(new Date(dateFrom), "dd MMM yyyy", { locale: idLocale })} – ${format(new Date(dateTo), "dd MMM yyyy", { locale: idLocale })}`
  } catch {
    return `${dateFrom} – ${dateTo}`
  }
}

function chunkRows<T>(rows: T[], firstPageSize: number, nextPageSize: number): T[][] {
  if (rows.length === 0) return [[]]
  const chunks: T[][] = [rows.slice(0, firstPageSize)]
  let cursor = firstPageSize
  while (cursor < rows.length) {
    chunks.push(rows.slice(cursor, cursor + nextPageSize))
    cursor += nextPageSize
  }
  return chunks
}

export function getPartyProductPdfOrientation(report: PartyProductMatrixReport): "portrait" | "landscape" {
  return report.dates.length <= 10 ? "portrait" : "landscape"
}

export function PartyProductReportPDF({
  report,
  storeName,
  storeAddress,
  storePhone,
  logoUrl,
}: PartyProductReportPdfProps) {
  const orientation = getPartyProductPdfOrientation(report)
  const isLandscape = orientation === "landscape"
  const dateWidth = isLandscape ? 20 : 22
  const noWidth = 24
  const productWidth = isLandscape ? 176 : 132
  const totalWidth = 38
  const stockWidth = 38
  const priceWidth = 68
  const period = formatPeriod(report.dateFrom, report.dateTo)
  const pageChunks = chunkRows(report.rows, isLandscape ? 14 : 24, isLandscape ? 24 : 36)

  const dateHeaderCell = {
    width: dateWidth,
    textAlign: "center" as const,
    borderLeftWidth: 0.5,
    borderLeftColor: "rgba(255,255,255,0.35)",
  }

  const bodyDateCell = {
    width: dateWidth,
    borderLeftWidth: 0.5,
    borderLeftColor: COLORS.borderDark,
    paddingHorizontal: 1,
  }

  function TableHeader() {
    return (
      <>
        <View style={[shared.tableHeader, { borderRadius: 2 }]}>
          <Text style={[shared.tableHeaderCell, { width: noWidth, textAlign: "center" }]}>No</Text>
          <Text style={[shared.tableHeaderCell, { width: productWidth }]}>Nama Barang</Text>
          <Text style={[shared.tableHeaderCell, { width: dateWidth * report.dates.length, textAlign: "center" }]}>
            Jumlah Menurut Tanggal
          </Text>
          <Text style={[shared.tableHeaderCell, { width: totalWidth, textAlign: "right" }]}>Total</Text>
          <Text style={[shared.tableHeaderCell, { width: stockWidth, textAlign: "right" }]}>Stock</Text>
          <Text style={[shared.tableHeaderCell, { width: priceWidth, textAlign: "right" }]}>Harga</Text>
        </View>

        <View style={[shared.tableHeader, { paddingTop: 4, paddingBottom: 4, backgroundColor: COLORS.secondary, borderRadius: 0 }]}>
          <Text style={[shared.tableHeaderCell, { width: noWidth }]} />
          <Text style={[shared.tableHeaderCell, { width: productWidth }]} />
          {report.dates.map((date) => (
            <Text key={date} style={[shared.tableHeaderCell, dateHeaderCell]}>
              {dateLabel(date)}
            </Text>
          ))}
          <Text style={[shared.tableHeaderCell, { width: totalWidth }]} />
          <Text style={[shared.tableHeaderCell, { width: stockWidth }]} />
          <Text style={[shared.tableHeaderCell, { width: priceWidth }]} />
        </View>
      </>
    )
  }

  function TableRows({ rows, offset }: { rows: PartyProductMatrixRow[]; offset: number }) {
    return (
      <>
        {rows.map((row, index) => {
          const globalIndex = offset + index
          return (
            <View
              key={row.productId}
              style={[shared.tableRow, globalIndex % 2 === 1 ? shared.tableRowAlt : {}]}
              wrap={false}
            >
              <Text style={[shared.tableCell, shared.tableCellCenter, { width: noWidth }]}>{globalIndex + 1}</Text>
              <View style={{ width: productWidth, paddingRight: 4 }}>
                <Text style={[shared.tableCellBold, { fontSize: isLandscape ? 7.5 : 8 }]}>{row.productName}</Text>
                <Text style={shared.tableCellMuted}>{row.productCode} · {row.unit}</Text>
              </View>
              {report.dates.map((date) => (
                <Text key={date} style={[shared.tableCell, shared.tableCellCenter, bodyDateCell]}>
                  {formatNumber(row.quantitiesByDate[date] ?? 0)}
                </Text>
              ))}
              <Text style={[shared.tableCellBold, shared.tableCellRight, { width: totalWidth }]}>
                {formatNumber(row.totalQty)}
              </Text>
              <Text style={[shared.tableCell, shared.tableCellRight, { width: stockWidth }]}>
                {formatNumber(row.stock)}
              </Text>
              <Text style={[shared.tableCell, shared.tableCellRight, { width: priceWidth }]}>
                {formatRp(Math.round(row.averagePrice))}
              </Text>
            </View>
          )
        })}
      </>
    )
  }

  return (
    <Document
      title={`Rekap Produk ${report.type === "customer" ? "Customer" : "Vendor"} — ${storeName}`}
      author={storeName}
      subject="Rekap Produk per Customer/Vendor"
    >
      {pageChunks.map((rows, pageIndex) => {
        const offset = pageChunks.slice(0, pageIndex).reduce((sum, chunk) => sum + chunk.length, 0)
        return (
          <Page key={pageIndex} size={PDF_PAGE_SIZE_F4} orientation={orientation} style={shared.page}>
            <PdfHeader
              storeName={storeName}
              storeAddress={storeAddress}
              storePhone={storePhone}
              logoUrl={logoUrl}
              title="Rekap Produk"
              subtitle={report.type === "customer" ? "Berdasarkan Customer" : "Berdasarkan Vendor"}
              period={period}
            />

            {pageIndex === 0 ? (
              <View style={shared.summaryRow}>
                <View style={shared.summaryCard}>
                  <Text style={shared.summaryCardLabel}>{report.type === "customer" ? "Customer" : "Vendor"}</Text>
                  <Text style={shared.summaryCardValue}>{report.partyName}</Text>
                </View>
                <View style={[shared.summaryCard, { borderLeftColor: COLORS.success }]}>
                  <Text style={shared.summaryCardLabel}>Total Qty</Text>
                  <Text style={[shared.summaryCardValue, { color: COLORS.success }]}>
                    {formatNumber(report.totalQty)}
                  </Text>
                </View>
                <View style={[shared.summaryCard, { borderLeftColor: COLORS.warning }]}>
                  <Text style={shared.summaryCardLabel}>Jumlah Produk</Text>
                  <Text style={[shared.summaryCardValue, { color: COLORS.warning }]}>
                    {report.rows.length.toLocaleString("id-ID")}
                  </Text>
                </View>
                <View style={[shared.summaryCard, { borderLeftColor: "#0891b2" }]}>
                  <Text style={shared.summaryCardLabel}>Jumlah Tanggal</Text>
                  <Text style={[shared.summaryCardValue, { color: "#0891b2" }]}>
                    {report.dates.length.toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={[shared.sectionTitle, { marginTop: 0 }]}>Rincian Produk per Tanggal (Lanjutan)</Text>
            )}

            {pageIndex === 0 && <Text style={shared.sectionTitle}>Rincian Produk per Tanggal</Text>}
            <View style={shared.table}>
              <TableHeader />
              <TableRows rows={rows} offset={offset} />
            </View>

            {pageIndex === pageChunks.length - 1 && (
              <View style={{ backgroundColor: "#f8fafc", borderRadius: 4, padding: 10, borderWidth: 0.5, borderColor: COLORS.border, marginTop: 8 }}>
                <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.secondary, marginBottom: 4 }}>Catatan Metodologi</Text>
                <Text style={{ fontSize: 7.5, color: COLORS.muted, lineHeight: 1.5 }}>
                  Harga adalah rata-rata aktual dalam periode, dihitung dari total nilai item dibagi total qty. Kolom tanggal menampilkan qty per hari dalam periode laporan.
                </Text>
              </View>
            )}

            <PdfFooter storeName={storeName} />
          </Page>
        )
      })}
    </Document>
  )
}
