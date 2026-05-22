import { Document, Page, View, Text } from "@react-pdf/renderer"
import { shared, COLORS, formatRp, formatPct } from "@/lib/pdf/styles"
import { PdfHeader } from "@/lib/pdf/PdfHeader"
import { PdfFooter } from "@/lib/pdf/PdfFooter"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { ProfitReport } from "../types/report.types"

interface ProfitReportPdfProps {
  data: ProfitReport
  storeName: string
  storeAddress?: string
  storePhone?: string
  logoUrl?: string
  dateFrom: Date
  dateTo: Date
}

export function ProfitReportPdf({
  data, storeName, storeAddress, storePhone, logoUrl, dateFrom, dateTo,
}: ProfitReportPdfProps) {
  const period = `${format(dateFrom, "dd MMM yyyy", { locale: idLocale })} – ${format(dateTo, "dd MMM yyyy", { locale: idLocale })}`

  return (
    <Document title={`Laporan Profit — ${storeName}`} author={storeName} subject="Laporan Profit & Rugi">
      <Page size="A4" style={shared.page}>
        <PdfHeader
          storeName={storeName}
          storeAddress={storeAddress}
          storePhone={storePhone}
          logoUrl={logoUrl}
          title="Laporan Laba Rugi"
          period={period}
        />

        {/* Summary Accrual */}
        <Text style={shared.sectionTitle}>Ringkasan Accrual (Nilai Penjualan)</Text>
        <View style={shared.summaryRow}>
          <View style={shared.summaryCard}>
            <Text style={shared.summaryCardLabel}>Total Revenue</Text>
            <Text style={shared.summaryCardValue}>{formatRp(data.totalRevenue)}</Text>
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: COLORS.warning }]}>
            <Text style={shared.summaryCardLabel}>Total HPP</Text>
            <Text style={[shared.summaryCardValue, { color: COLORS.warning }]}>{formatRp(data.totalHPP)}</Text>
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: COLORS.success }]}>
            <Text style={shared.summaryCardLabel}>Gross Profit</Text>
            <Text style={[shared.summaryCardValue, { color: data.totalProfit >= 0 ? COLORS.success : COLORS.danger }]}>
              {formatRp(data.totalProfit)}
            </Text>
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: "#7c3aed" }]}>
            <Text style={shared.summaryCardLabel}>Profit Margin</Text>
            <Text style={[shared.summaryCardValue, { color: "#7c3aed" }]}>{formatPct(data.profitMargin)}</Text>
          </View>
        </View>

        {/* Summary Cash */}
        <Text style={shared.sectionTitle}>Ringkasan Cash Basis (Kas Diterima)</Text>
        <View style={shared.summaryRow}>
          <View style={[shared.summaryCard, { borderLeftColor: COLORS.success }]}>
            <Text style={shared.summaryCardLabel}>Total Kas Masuk</Text>
            <Text style={[shared.summaryCardValue, { color: COLORS.success }]}>{formatRp(data.totalCashRevenue)}</Text>
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: "#0891b2" }]}>
            <Text style={shared.summaryCardLabel}>Cash Profit</Text>
            <Text style={[shared.summaryCardValue, { color: "#0891b2" }]}>{formatRp(data.totalCashProfit)}</Text>
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: "#7c3aed" }]}>
            <Text style={shared.summaryCardLabel}>Cash Margin</Text>
            <Text style={[shared.summaryCardValue, { color: "#7c3aed" }]}>{formatPct(data.cashProfitMargin)}</Text>
          </View>
          <View style={[shared.summaryCard, { borderLeftColor: COLORS.warning }]}>
            <Text style={shared.summaryCardLabel}>Piutang Baru</Text>
            <Text style={[shared.summaryCardValue, { color: COLORS.warning }]}>{formatRp(data.totalNewDebt)}</Text>
          </View>
        </View>

        {/* Tabel detail */}
        <Text style={shared.sectionTitle}>Rincian per Hari</Text>
        <View style={shared.table}>
          <View style={shared.tableHeader}>
            <Text style={[shared.tableHeaderCell, { flex: 2 }]}>Tanggal</Text>
            <Text style={[shared.tableHeaderCell, { flex: 2, textAlign: "right" }]}>Revenue</Text>
            <Text style={[shared.tableHeaderCell, { flex: 2, textAlign: "right" }]}>Kas Masuk</Text>
            <Text style={[shared.tableHeaderCell, { flex: 2, textAlign: "right" }]}>HPP</Text>
            <Text style={[shared.tableHeaderCell, { flex: 2, textAlign: "right" }]}>Profit</Text>
            <Text style={[shared.tableHeaderCell, { flex: 1.5, textAlign: "right" }]}>Margin</Text>
          </View>

          {data.data.map((row, i) => {
            let dateLabel = row.date
            try { dateLabel = format(new Date(row.date), "dd MMM yyyy", { locale: idLocale }) } catch {}
            const margin = row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0

            return (
              <View key={row.date} style={[shared.tableRow, i % 2 === 1 ? shared.tableRowAlt : {}]}>
                <Text style={[shared.tableCell, { flex: 2 }]}>{dateLabel}</Text>
                <Text style={[shared.tableCell, shared.tableCellRight, { flex: 2 }]}>{formatRp(row.revenue)}</Text>
                <Text style={[shared.tableCell, shared.tableCellRight, { flex: 2, color: COLORS.success }]}>{formatRp(row.cashRevenue)}</Text>
                <Text style={[shared.tableCell, shared.tableCellRight, { flex: 2, color: COLORS.muted }]}>{formatRp(row.hpp)}</Text>
                <Text style={[shared.tableCell, shared.tableCellRight, { flex: 2, color: row.profit >= 0 ? COLORS.success : COLORS.danger }]}>
                  {formatRp(row.profit)}
                </Text>
                <Text style={[shared.tableCell, shared.tableCellRight, { flex: 1.5, color: margin >= 0 ? COLORS.success : COLORS.danger }]}>
                  {formatPct(margin)}
                </Text>
              </View>
            )
          })}

          <View style={shared.tableTotalRow}>
            <Text style={[shared.tableTotalCell, { flex: 2 }]}>TOTAL</Text>
            <Text style={[shared.tableTotalCell, shared.tableCellRight, { flex: 2 }]}>{formatRp(data.totalRevenue)}</Text>
            <Text style={[shared.tableTotalCell, shared.tableCellRight, { flex: 2, color: COLORS.success }]}>{formatRp(data.totalCashRevenue)}</Text>
            <Text style={[shared.tableTotalCell, shared.tableCellRight, { flex: 2 }]}>{formatRp(data.totalHPP)}</Text>
            <Text style={[shared.tableTotalCell, shared.tableCellRight, { flex: 2, color: data.totalProfit >= 0 ? COLORS.success : COLORS.danger }]}>
              {formatRp(data.totalProfit)}
            </Text>
            <Text style={[shared.tableTotalCell, shared.tableCellRight, { flex: 1.5 }]}>{formatPct(data.profitMargin)}</Text>
          </View>
        </View>

        <PdfFooter storeName={storeName} />
      </Page>
    </Document>
  )
}
