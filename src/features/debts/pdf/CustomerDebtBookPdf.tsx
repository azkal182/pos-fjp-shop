import { Document, Page, Text, View } from "@react-pdf/renderer"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { COLORS, PDF_PAGE_SIZE_F4, formatRp, shared } from "@/lib/pdf/styles"
import { PdfFooter } from "@/lib/pdf/PdfFooter"
import { PdfHeader } from "@/lib/pdf/PdfHeader"
import type { CustomerDebtBookReport, CustomerDebtBookRow } from "../services/debt.service"

interface CustomerDebtBookPdfProps {
  report: CustomerDebtBookReport
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

function formatDateTime(date: Date): string {
  return format(new Date(date), "dd MMM yyyy HH:mm", { locale: idLocale })
}

function formatBalance(value: number): string {
  if (value > 0) return `Hutang ${formatRp(value)}`
  if (value < 0) return `Deposit ${formatRp(Math.abs(value))}`
  return "Lunas"
}

function typeLabel(type: CustomerDebtBookRow["type"]): string {
  switch (type) {
    case "DEBT":
      return "Tagihan"
    case "PAYMENT":
      return "Pembayaran"
    case "DEPOSIT_IN":
      return "Deposit Masuk"
    case "DEPOSIT_OUT":
      return "Deposit Dipakai"
    case "DEPOSIT_RETURN":
      return "Deposit Return"
  }
}

function InvoiceDetail({ row }: { row: CustomerDebtBookRow }) {
  if (!row.invoiceDetails) return null

  return (
    <View style={{ marginLeft: 94, marginRight: 10, marginTop: -1, marginBottom: 4, borderLeftWidth: 1.5, borderLeftColor: COLORS.primaryLight, paddingLeft: 6, paddingTop: 3 }}>
      <View style={{ flexDirection: "row", marginBottom: 2 }}>
        <Text style={{ flex: 1, fontSize: 6.2, color: COLORS.muted, fontFamily: "Helvetica-Bold" }}>Detail item invoice</Text>
        <Text style={{ width: 42, fontSize: 6.2, color: COLORS.muted, textAlign: "right", fontFamily: "Helvetica-Bold" }}>Qty</Text>
        <Text style={{ width: 64, fontSize: 6.2, color: COLORS.muted, textAlign: "right", fontFamily: "Helvetica-Bold" }}>Harga</Text>
        <Text style={{ width: 68, fontSize: 6.2, color: COLORS.muted, textAlign: "right", fontFamily: "Helvetica-Bold" }}>Subtotal</Text>
      </View>
      {row.invoiceDetails.items.map((item, index) => (
        <View key={`${row.id}-${index}`} style={{ flexDirection: "row", marginTop: index === 0 ? 0 : 1.5 }}>
          <View style={{ flex: 1, paddingRight: 4 }}>
            <Text style={{ fontSize: 6.7, color: COLORS.secondary }}>
              {item.productName}
            </Text>
            {item.productCode ? (
              <Text style={{ fontSize: 6.1, color: COLORS.muted }}>{item.productCode}</Text>
            ) : null}
          </View>
          <Text style={{ width: 42, fontSize: 6.5, color: COLORS.secondary, textAlign: "right" }}>
            {item.quantity.toLocaleString("id-ID")} {item.unit ?? ""}
          </Text>
          <Text style={{ width: 64, fontSize: 6.5, color: COLORS.secondary, textAlign: "right" }}>
            {formatRp(item.price)}
          </Text>
          <Text style={{ width: 68, fontSize: 6.5, color: COLORS.black, textAlign: "right", fontFamily: "Helvetica-Bold" }}>
            {formatRp(item.subtotal)}
          </Text>
        </View>
      ))}

      {(row.invoiceDetails.packingFee > 0 || row.invoiceDetails.discountAmount > 0) && (
        <View style={{ marginTop: 3, paddingTop: 2, borderTopWidth: 0.5, borderTopColor: COLORS.border }}>
          {row.invoiceDetails.packingFee > 0 ? (
            <View style={{ flexDirection: "row" }}>
              <Text style={{ flex: 1, fontSize: 6.4, color: COLORS.muted }}>Biaya packing</Text>
              <Text style={{ width: 68, fontSize: 6.4, color: COLORS.secondary, textAlign: "right" }}>
                {formatRp(row.invoiceDetails.packingFee)}
              </Text>
            </View>
          ) : null}
          {row.invoiceDetails.discountAmount > 0 ? (
            <View style={{ flexDirection: "row" }}>
              <Text style={{ flex: 1, fontSize: 6.4, color: COLORS.muted }}>Diskon transaksi</Text>
              <Text style={{ width: 68, fontSize: 6.4, color: COLORS.danger, textAlign: "right" }}>
                -{formatRp(row.invoiceDetails.discountAmount)}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  )
}

export function CustomerDebtBookPdf({
  report,
  storeName,
  storeAddress,
  storePhone,
  logoUrl,
}: CustomerDebtBookPdfProps) {
  const period = formatPeriod(report.dateFrom, report.dateTo)
  const columnWidths = {
    no: 22,
    date: 66,
    description: 154,
    reference: 62,
    increase: 64,
    decrease: 64,
    balance: 88,
  }

  const separator = {
    borderLeftWidth: 0.5,
    borderLeftColor: COLORS.borderDark,
    paddingLeft: 5,
  }

  function TableHeader() {
    return (
      <View style={[shared.tableHeader, { paddingHorizontal: 6, paddingVertical: 5 }]}>
        <Text style={[shared.tableHeaderCell, shared.tableCellCenter, { width: columnWidths.no }]}>No</Text>
        <Text style={[shared.tableHeaderCell, { width: columnWidths.date }]}>Tanggal</Text>
        <Text style={[shared.tableHeaderCell, { width: columnWidths.description }]}>Keterangan</Text>
        <Text style={[shared.tableHeaderCell, { width: columnWidths.reference }]}>Ref</Text>
        <Text style={[shared.tableHeaderCell, shared.tableCellRight, { width: columnWidths.increase }]}>Tambah</Text>
        <Text style={[shared.tableHeaderCell, shared.tableCellRight, { width: columnWidths.decrease }]}>Kurangi</Text>
        <Text style={[shared.tableHeaderCell, shared.tableCellRight, separator, { width: columnWidths.balance }]}>Saldo</Text>
      </View>
    )
  }

  function TableRows() {
    if (report.rows.length === 0) {
      return (
        <View style={[shared.tableRow, { paddingHorizontal: 6, paddingVertical: 10 }]}>
          <Text style={[shared.tableCell, shared.tableCellCenter, { width: "100%", color: COLORS.muted }]}>
            Tidak ada mutasi buku hutang pada periode ini.
          </Text>
        </View>
      )
    }

    return (
      <>
        {report.rows.map((row, index) => (
          <View
            key={row.id}
            style={[
              { borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
              index % 2 === 1 ? shared.tableRowAlt : {},
            ]}
          >
            <View style={[shared.tableRow, { paddingHorizontal: 6, paddingVertical: 4, borderBottomWidth: 0 }]}>
              <Text style={[shared.tableCell, shared.tableCellCenter, { width: columnWidths.no }]}>
                {index + 1}
              </Text>
              <Text style={[shared.tableCell, { width: columnWidths.date, fontSize: 7.3 }]}>
                {formatDateTime(row.date)}
              </Text>
              <View style={{ width: columnWidths.description, paddingRight: 6 }}>
                <Text style={[shared.tableCellBold, { fontSize: 8 }]}>{row.humanDescription}</Text>
                <Text style={[shared.tableCellMuted, { fontSize: 6.5 }]}>
                  {typeLabel(row.type)}
                  {row.notes ? ` · ${row.notes}` : ""}
                </Text>
                {row.allocationSummary ? (
                  <Text style={[shared.tableCellMuted, { fontSize: 6.5 }]}>
                    Alokasi FIFO: {row.allocationSummary}
                  </Text>
                ) : null}
              </View>
              <Text style={[shared.tableCell, { width: columnWidths.reference, fontSize: 7.1 }]}>
                {row.reference}
              </Text>
              <Text style={[shared.tableCell, shared.tableCellRight, { width: columnWidths.increase, color: row.increase > 0 ? COLORS.danger : COLORS.muted }]}>
                {row.increase > 0 ? formatRp(row.increase) : "-"}
              </Text>
              <Text style={[shared.tableCell, shared.tableCellRight, { width: columnWidths.decrease, color: row.decrease > 0 ? COLORS.success : COLORS.muted }]}>
                {row.decrease > 0 ? formatRp(row.decrease) : "-"}
              </Text>
              <Text
                style={[
                  shared.tableCellBold,
                  shared.tableCellRight,
                  separator,
                  {
                    width: columnWidths.balance,
                    fontSize: 7.4,
                    color: row.balance > 0 ? COLORS.danger : row.balance < 0 ? COLORS.primary : COLORS.success,
                  },
                ]}
              >
                {formatBalance(row.balance)}
              </Text>
            </View>
            <InvoiceDetail row={row} />
          </View>
        ))}
      </>
    )
  }

  return (
    <Document
      title={`Buku Hutang ${report.customer.name} - ${storeName}`}
      author={storeName}
      subject="Laporan buku hutang customer"
    >
      <Page size={PDF_PAGE_SIZE_F4} orientation="portrait" style={shared.page}>
        <PdfHeader
          storeName={storeName}
          storeAddress={storeAddress}
          storePhone={storePhone}
          logoUrl={logoUrl}
          title="Buku Hutang Customer"
          subtitle={report.customer.name}
          period={period}
        />

        <View style={shared.summaryRow}>
          <View style={shared.summaryCard}>
            <Text style={shared.summaryCardLabel}>Saldo Awal</Text>
            <Text style={shared.summaryCardValue}>{formatBalance(report.openingBalance)}</Text>
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: COLORS.danger }]}>
            <Text style={shared.summaryCardLabel}>Tambah Saldo</Text>
            <Text style={[shared.summaryCardValue, { color: COLORS.danger }]}>
              {formatRp(report.summary.totalIncrease)}
            </Text>
            <Text style={shared.summaryCardSub}>tagihan / deposit keluar</Text>
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: COLORS.success }]}>
            <Text style={shared.summaryCardLabel}>Kurangi Saldo</Text>
            <Text style={[shared.summaryCardValue, { color: COLORS.success }]}>
              {formatRp(report.summary.totalDecrease)}
            </Text>
            <Text style={shared.summaryCardSub}>bayar / deposit masuk</Text>
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: COLORS.primary }]}>
            <Text style={shared.summaryCardLabel}>Saldo Akhir</Text>
            <Text style={[shared.summaryCardValue, { color: report.closingBalance > 0 ? COLORS.danger : COLORS.primary }]}>
              {formatBalance(report.closingBalance)}
            </Text>
          </View>
        </View>

        <View style={[shared.summaryRow, { marginBottom: 10 }]}>
          <View style={[shared.summaryCard, { backgroundColor: "#fff7ed", borderLeftColor: COLORS.warning }]}>
            <Text style={shared.summaryCardLabel}>Tagihan Periode</Text>
            <Text style={[shared.summaryCardValue, { color: COLORS.warning }]}>
              {formatRp(report.summary.totalDebt)}
            </Text>
          </View>
          <View style={[shared.summaryCard, { backgroundColor: "#f0fdf4", borderLeftColor: COLORS.success }]}>
            <Text style={shared.summaryCardLabel}>Pembayaran Hutang</Text>
            <Text style={[shared.summaryCardValue, { color: COLORS.success }]}>
              {formatRp(report.summary.totalPayment)}
            </Text>
          </View>
          <View style={[shared.summaryCard, { backgroundColor: "#eff6ff", borderLeftColor: COLORS.primary }]}>
            <Text style={shared.summaryCardLabel}>Deposit Masuk</Text>
            <Text style={[shared.summaryCardValue, { color: COLORS.primary }]}>
              {formatRp(report.summary.totalDepositIn)}
            </Text>
          </View>
          <View style={[shared.summaryCard, { backgroundColor: "#fffbeb", borderLeftColor: COLORS.warning }]}>
            <Text style={shared.summaryCardLabel}>Deposit Dipakai/Return</Text>
            <Text style={[shared.summaryCardValue, { color: COLORS.warning }]}>
              {formatRp(report.summary.totalDepositOut)}
            </Text>
          </View>
        </View>

        <Text style={shared.sectionTitle}>Mutasi Buku Hutang</Text>

        <View style={shared.table}>
          <TableHeader />
          <TableRows />
        </View>

        <View style={{ backgroundColor: "#f8fafc", borderRadius: 4, padding: 10, borderWidth: 0.5, borderColor: COLORS.border, marginTop: 12 }} wrap={false}>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.secondary, marginBottom: 4 }}>
            Cara Membaca
          </Text>
          <Text style={{ fontSize: 7.5, color: COLORS.muted, lineHeight: 1.5 }}>
            Saldo positif berarti customer masih memiliki hutang. Saldo negatif berarti customer memiliki deposit/kredit di toko. Kolom Tambah Saldo menambah kewajiban customer, sedangkan Kurangi Saldo mengurangi kewajiban atau menambah deposit.
          </Text>
        </View>

        <PdfFooter storeName={storeName} />
      </Page>
    </Document>
  )
}
