import { Document, Page, View, Text } from "@react-pdf/renderer"
import { shared, COLORS, formatRp, formatPct } from "@/lib/pdf/styles"
import { PdfHeader } from "@/lib/pdf/PdfHeader"
import { PdfFooter } from "@/lib/pdf/PdfFooter"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { SalesReport } from "../types/report.types"

interface SalesReportPdfProps {
  data: SalesReport
  storeName: string
  storeAddress?: string
  storePhone?: string
  dateFrom: Date
  dateTo: Date
}

export function SalesReportPdf({
  data, storeName, storeAddress, storePhone, dateFrom, dateTo,
}: SalesReportPdfProps) {
  const period = `${format(dateFrom, "dd MMM yyyy", { locale: idLocale })} – ${format(dateTo, "dd MMM yyyy", { locale: idLocale })}`

  return (
    <Document
      title={`Laporan Penjualan — ${storeName}`}
      author={storeName}
      subject="Laporan Penjualan"
    >
      <Page size="A4" style={shared.page}>
        <PdfHeader
          storeName={storeName}
          storeAddress={storeAddress}
          storePhone={storePhone}
          title="Laporan Penjualan"
          period={period}
        />

        {/* Summary cards */}
        <View style={shared.summaryRow}>
          <View style={shared.summaryCard}>
            <Text style={shared.summaryCardLabel}>Nilai Penjualan (Accrual)</Text>
            <Text style={shared.summaryCardValue}>{formatRp(data.totalRevenue)}</Text>
            <Text style={shared.summaryCardSub}>{data.totalTransactions} transaksi</Text>
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: COLORS.success }]}>
            <Text style={shared.summaryCardLabel}>Kas Masuk (Cash Basis)</Text>
            <Text style={[shared.summaryCardValue, { color: COLORS.success }]}>
              {formatRp(data.totalCashCollected)}
            </Text>
            <Text style={shared.summaryCardSub}>Tunai + bayar hutang</Text>
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: COLORS.warning }]}>
            <Text style={shared.summaryCardLabel}>Piutang Baru</Text>
            <Text style={[shared.summaryCardValue, { color: COLORS.warning }]}>
              {formatRp(data.totalNewDebt)}
            </Text>
            <Text style={shared.summaryCardSub}>Belum dibayar</Text>
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: "#7c3aed" }]}>
            <Text style={shared.summaryCardLabel}>Bayar Hutang Lama</Text>
            <Text style={[shared.summaryCardValue, { color: "#7c3aed" }]}>
              {formatRp(data.totalDebtPaymentsReceived)}
            </Text>
            <Text style={shared.summaryCardSub}>Cicilan customer</Text>
          </View>
        </View>

        {/* Perbandingan periode */}
        {data.comparisonRevenue > 0 && (
          <View style={{ flexDirection: "row", marginBottom: 12, gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: "#f8fafc", borderRadius: 4, padding: 8, borderWidth: 0.5, borderColor: COLORS.border }}>
              <Text style={{ fontSize: 7, color: COLORS.muted, marginBottom: 2 }}>PERIODE SEBELUMNYA</Text>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold" }}>{formatRp(data.comparisonRevenue)}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: data.revenueChange >= 0 ? "#f0fdf4" : "#fef2f2", borderRadius: 4, padding: 8, borderWidth: 0.5, borderColor: data.revenueChange >= 0 ? "#bbf7d0" : "#fecaca" }}>
              <Text style={{ fontSize: 7, color: COLORS.muted, marginBottom: 2 }}>PERUBAHAN</Text>
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: data.revenueChange >= 0 ? COLORS.success : COLORS.danger }}>
                {data.revenueChange >= 0 ? "+" : ""}{formatPct(data.revenueChange)}
              </Text>
            </View>
          </View>
        )}

        {/* Tabel detail per periode */}
        <Text style={shared.sectionTitle}>Rincian per Periode</Text>
        <View style={shared.table}>
          {/* Header */}
          <View style={shared.tableHeader}>
            <Text style={[shared.tableHeaderCell, { flex: 2 }]}>Tanggal / Periode</Text>
            <Text style={[shared.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Transaksi</Text>
            <Text style={[shared.tableHeaderCell, { flex: 2, textAlign: "right" }]}>Nilai Penjualan</Text>
            <Text style={[shared.tableHeaderCell, { flex: 2, textAlign: "right" }]}>Kas Masuk</Text>
            <Text style={[shared.tableHeaderCell, { flex: 2, textAlign: "right" }]}>Piutang Baru</Text>
          </View>

          {/* Rows */}
          {data.data.map((row, i) => {
            let dateLabel = row.date
            try {
              dateLabel = format(new Date(row.date), "dd MMM yyyy", { locale: idLocale })
            } catch {}

            return (
              <View key={row.date} style={[shared.tableRow, i % 2 === 1 ? shared.tableRowAlt : {}]}>
                <Text style={[shared.tableCell, { flex: 2 }]}>{dateLabel}</Text>
                <Text style={[shared.tableCell, shared.tableCellCenter, { flex: 1 }]}>{row.transactionCount}</Text>
                <Text style={[shared.tableCell, shared.tableCellRight, { flex: 2 }]}>{formatRp(row.totalRevenue)}</Text>
                <Text style={[shared.tableCell, shared.tableCellRight, { flex: 2, color: COLORS.success }]}>{formatRp(row.cashCollected)}</Text>
                <Text style={[shared.tableCell, shared.tableCellRight, { flex: 2, color: row.newDebt > 0 ? COLORS.warning : COLORS.muted }]}>
                  {row.newDebt > 0 ? formatRp(row.newDebt) : "—"}
                </Text>
              </View>
            )
          })}

          {/* Total row */}
          <View style={shared.tableTotalRow}>
            <Text style={[shared.tableTotalCell, { flex: 2 }]}>TOTAL</Text>
            <Text style={[shared.tableTotalCell, shared.tableCellCenter, { flex: 1 }]}>{data.totalTransactions}</Text>
            <Text style={[shared.tableTotalCell, shared.tableCellRight, { flex: 2 }]}>{formatRp(data.totalRevenue)}</Text>
            <Text style={[shared.tableTotalCell, shared.tableCellRight, { flex: 2, color: COLORS.success }]}>{formatRp(data.totalCashCollected)}</Text>
            <Text style={[shared.tableTotalCell, shared.tableCellRight, { flex: 2, color: COLORS.warning }]}>{formatRp(data.totalNewDebt)}</Text>
          </View>
        </View>

        {/* Catatan metodologi */}
        <View style={{ backgroundColor: "#f8fafc", borderRadius: 4, padding: 10, borderWidth: 0.5, borderColor: COLORS.border, marginTop: 8 }}>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.secondary, marginBottom: 4 }}>Catatan Metodologi</Text>
          <Text style={{ fontSize: 7.5, color: COLORS.muted, lineHeight: 1.5 }}>
            • Nilai Penjualan (Accrual): Total tagihan semua transaksi yang dikonfirmasi, termasuk yang belum dibayar.{"\n"}
            • Kas Masuk (Cash Basis): Uang tunai yang diterima saat transaksi + pembayaran hutang dari customer.{"\n"}
            • Piutang Baru: Nilai transaksi yang belum dibayar pada periode ini.
          </Text>
        </View>

        <PdfFooter storeName={storeName} />
      </Page>
    </Document>
  )
}
