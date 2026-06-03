import { Document, Page, Text, View } from "@react-pdf/renderer"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { COLORS, PDF_PAGE_SIZE_F4, formatRp, shared } from "@/lib/pdf/styles"
import { PdfFooter } from "@/lib/pdf/PdfFooter"
import { PdfHeader } from "@/lib/pdf/PdfHeader"
import type {
  CustomerProductHistoryReport,
  CustomerProductHistoryRow,
} from "../services/customer.service"

interface CustomerProductHistoryPdfProps {
  report: CustomerProductHistoryReport
  storeName: string
  storeAddress?: string
  storePhone?: string
  logoUrl?: string
}

function formatPeriod(dateFrom: string, dateTo: string): string {
  try {
    return `${format(new Date(dateFrom), "dd MMM yyyy", { locale: idLocale })} - ${format(new Date(dateTo), "dd MMM yyyy", { locale: idLocale })}`
  } catch {
    return `${dateFrom} - ${dateTo}`
  }
}

function formatDate(date: Date): string {
  return format(new Date(date), "dd MMM yyyy", { locale: idLocale })
}

function formatQty(row: CustomerProductHistoryRow): string {
  if (row.quantity === null) return "-"
  return `${row.quantity.toLocaleString("id-ID")} ${row.unit ?? ""}`.trim()
}

function formatPrice(row: CustomerProductHistoryRow): string {
  return row.price === null ? "-" : formatRp(row.price)
}

export function CustomerProductHistoryPdf({
  report,
  storeName,
  storeAddress,
  storePhone,
  logoUrl,
}: CustomerProductHistoryPdfProps) {
  const period = formatPeriod(report.dateFrom, report.dateTo)

  // Area cetak F4 portrait: 612pt - padding kiri/kanan 80pt = 532pt.
  // Table padding horizontal 6pt kiri/kanan, jadi total kolom dijaga di 520pt.
  const columnWidths = {
    no: 24,
    date: 62,
    code: 96,
    product: 162,
    qty: 44,
    price: 66,
    total: 68,
  }

  const tableCellSeparator = {
    borderLeftWidth: 0.5,
    borderLeftColor: COLORS.borderDark,
    paddingLeft: 5,
  }

  function TableHeader() {
    return (
      <View style={[shared.tableHeader, { paddingHorizontal: 6, paddingVertical: 5 }]}>
        <Text style={[shared.tableHeaderCell, shared.tableCellCenter, { width: columnWidths.no }]}>No</Text>
        <Text style={[shared.tableHeaderCell, { width: columnWidths.date }]}>Tanggal</Text>
        <Text style={[shared.tableHeaderCell, { width: columnWidths.code }]}>Transaksi</Text>
        <Text style={[shared.tableHeaderCell, tableCellSeparator, { width: columnWidths.product }]}>Nama Barang</Text>
        <Text style={[shared.tableHeaderCell, shared.tableCellRight, { width: columnWidths.qty }]}>Jumlah</Text>
        <Text style={[shared.tableHeaderCell, shared.tableCellRight, { width: columnWidths.price }]}>Harga</Text>
        <Text style={[shared.tableHeaderCell, shared.tableCellRight, { width: columnWidths.total }]}>Total</Text>
      </View>
    )
  }

  function TableRows({ rows }: { rows: CustomerProductHistoryRow[] }) {
    return (
      <>
        {rows.map((row, index) => {
          const isAdjustment = row.type !== "ITEM"
          return (
            <View
              key={row.id}
              style={[
                shared.tableRow,
                { paddingHorizontal: 6, paddingVertical: 3.5 },
                index % 2 === 1 ? shared.tableRowAlt : {},
                isAdjustment ? { backgroundColor: "#fffbeb" } : {},
              ]}
              wrap={false}
            >
              <Text style={[shared.tableCell, shared.tableCellCenter, { width: columnWidths.no }]}>
                {index + 1}
              </Text>
              <Text style={[shared.tableCell, { width: columnWidths.date }]}>{formatDate(row.date)}</Text>
              <Text style={[shared.tableCell, { width: columnWidths.code }]}>{row.transactionCode}</Text>
              <View style={[tableCellSeparator, { width: columnWidths.product, paddingRight: 6 }]}>
                <Text style={[isAdjustment ? shared.tableCellBold : shared.tableCell, { color: isAdjustment ? COLORS.warning : COLORS.secondary, fontSize: 8 }]}>
                  {row.productName}
                </Text>
                {row.productCode ? <Text style={[shared.tableCellMuted, { fontSize: 6.8 }]}>{row.productCode}</Text> : null}
              </View>
              <Text style={[shared.tableCell, shared.tableCellRight, { width: columnWidths.qty }]}>{formatQty(row)}</Text>
              <Text style={[shared.tableCell, shared.tableCellRight, { width: columnWidths.price }]}>{formatPrice(row)}</Text>
              <Text
                style={[
                  row.type === "TRANSACTION_DISCOUNT" ? shared.tableCell : shared.tableCellBold,
                  shared.tableCellRight,
                  { width: columnWidths.total, color: row.total < 0 ? COLORS.danger : COLORS.black },
                ]}
              >
                {row.total < 0 ? `-${formatRp(Math.abs(row.total))}` : formatRp(row.total)}
              </Text>
            </View>
          )
        })}
      </>
    )
  }

  return (
    <Document
      title={`Riwayat Belanja ${report.customer.name} - ${storeName}`}
      author={storeName}
      subject="Laporan riwayat belanja customer"
    >
      <Page size={PDF_PAGE_SIZE_F4} orientation="portrait" style={shared.page}>
        <PdfHeader
          storeName={storeName}
          storeAddress={storeAddress}
          storePhone={storePhone}
          logoUrl={logoUrl}
          title="Riwayat Belanja Customer"
          subtitle={report.customer.name}
          period={period}
        />

        <View style={shared.summaryRow}>
          <View style={shared.summaryCard}>
            <Text style={shared.summaryCardLabel}>Customer</Text>
            <Text style={shared.summaryCardValue}>{report.customer.name}</Text>
            {report.customer.phone ? <Text style={shared.summaryCardSub}>{report.customer.phone}</Text> : null}
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: COLORS.success }]}>
            <Text style={shared.summaryCardLabel}>Total Transaksi</Text>
            <Text style={[shared.summaryCardValue, { color: COLORS.success }]}>
              {report.transactionsCount.toLocaleString("id-ID")}
            </Text>
            <Text style={shared.summaryCardSub}>invoice confirmed</Text>
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: COLORS.warning }]}>
            <Text style={shared.summaryCardLabel}>Total Qty</Text>
            <Text style={[shared.summaryCardValue, { color: COLORS.warning }]}>
              {report.summary.totalQuantity.toLocaleString("id-ID")}
            </Text>
            <Text style={shared.summaryCardSub}>qty barang</Text>
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: "#0891b2" }]}>
            <Text style={shared.summaryCardLabel}>Total Tagihan</Text>
            <Text style={[shared.summaryCardValue, { color: "#0891b2" }]}>
              {formatRp(report.summary.grandTotal)}
            </Text>
            <Text style={shared.summaryCardSub}>item + packing - diskon</Text>
          </View>
        </View>

        <Text style={shared.sectionTitle}>Rincian Item dan Biaya</Text>

        <View style={shared.table}>
          <TableHeader />
          <TableRows rows={report.rows} />
        </View>

        <View style={{ marginLeft: "auto", width: 250, marginTop: 8 }} wrap={false}>
          <View style={[shared.tableRow, { paddingHorizontal: 8 }]}>
            <Text style={[shared.tableCell, { flex: 1 }]}>Subtotal Item</Text>
            <Text style={[shared.tableCellBold, shared.tableCellRight, { width: 95 }]}>
              {formatRp(report.summary.itemSubtotal)}
            </Text>
          </View>
          <View style={[shared.tableRow, { paddingHorizontal: 8 }]}>
            <Text style={[shared.tableCell, { flex: 1 }]}>Biaya Packing</Text>
            <Text style={[shared.tableCellBold, shared.tableCellRight, { width: 95 }]}>
              {formatRp(report.summary.packingFee)}
            </Text>
          </View>
          <View style={[shared.tableRow, { paddingHorizontal: 8 }]}>
            <Text style={[shared.tableCell, { flex: 1 }]}>Diskon Transaksi</Text>
            <Text style={[shared.tableCellBold, shared.tableCellRight, { width: 95, color: COLORS.danger }]}>
              -{formatRp(report.summary.transactionDiscount)}
            </Text>
          </View>
          <View style={[shared.tableTotalRow, { paddingHorizontal: 8 }]}>
            <Text style={[shared.tableTotalCell, { flex: 1 }]}>Total</Text>
            <Text style={[shared.tableTotalCell, shared.tableCellRight, { width: 95 }]}>
              {formatRp(report.summary.grandTotal)}
            </Text>
          </View>
        </View>

        <View style={{ backgroundColor: "#f8fafc", borderRadius: 4, padding: 10, borderWidth: 0.5, borderColor: COLORS.border, marginTop: 12 }}>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.secondary, marginBottom: 4 }}>
            Catatan
          </Text>
          <Text style={{ fontSize: 7.5, color: COLORS.muted, lineHeight: 1.5 }}>
            Harga barang memakai harga bersih per item setelah diskon item. Biaya packing dan diskon transaksi ditampilkan sebagai baris terpisah agar total laporan tetap sesuai dengan total invoice.
          </Text>
        </View>

        <PdfFooter storeName={storeName} />
      </Page>
    </Document>
  )
}
