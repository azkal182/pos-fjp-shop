import { Document, Page, View, Text } from "@react-pdf/renderer"
import { shared, COLORS, formatRp } from "@/lib/pdf/styles"
import { PdfHeader } from "@/lib/pdf/PdfHeader"
import { PdfFooter } from "@/lib/pdf/PdfFooter"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface DebtRow {
  id: string
  customerId: string
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  status: string
  debtDate: Date | string
  customer: { id: string; name: string; phone: string | null }
  transaction: { code: string; id?: string }
}

interface DebtReportPdfProps {
  debts: DebtRow[]
  storeName: string
  storeAddress?: string
  storePhone?: string
  logoUrl?: string
  totalOutstanding: number
  customersWithDebt: number
}

const STATUS_LABELS: Record<string, string> = {
  UNPAID: "Belum Bayar",
  PARTIAL: "Sebagian",
  PAID: "Lunas",
}

export function DebtReportPdf({
  debts, storeName, storeAddress, storePhone, logoUrl, totalOutstanding, customersWithDebt,
}: DebtReportPdfProps) {
  // Group by customer
  const customerMap = new Map<string, { name: string; phone: string | null; debts: DebtRow[]; total: number }>()
  for (const d of debts) {
    const existing = customerMap.get(d.customerId)
    if (existing) {
      existing.debts.push(d)
      existing.total += Number(d.remainingAmount)
    } else {
      customerMap.set(d.customerId, {
        name: d.customer.name,
        phone: d.customer.phone,
        debts: [d],
        total: Number(d.remainingAmount),
      })
    }
  }
  const customers = Array.from(customerMap.values()).sort((a, b) => b.total - a.total)

  return (
    <Document title={`Laporan Piutang — ${storeName}`} author={storeName} subject="Laporan Piutang Customer">
      <Page size="A4" style={shared.page}>
        <PdfHeader
          storeName={storeName}
          storeAddress={storeAddress}
          storePhone={storePhone}
          logoUrl={logoUrl}
          title="Laporan Piutang"
          subtitle="Daftar Hutang Customer Aktif"
        />

        {/* Summary */}
        <View style={shared.summaryRow}>
          <View style={[shared.summaryCard, { borderLeftColor: COLORS.danger }]}>
            <Text style={shared.summaryCardLabel}>Total Piutang Outstanding</Text>
            <Text style={[shared.summaryCardValue, { color: COLORS.danger }]}>{formatRp(totalOutstanding)}</Text>
          </View>
          <View style={shared.summaryCard}>
            <Text style={shared.summaryCardLabel}>Customer Berpiutang</Text>
            <Text style={shared.summaryCardValue}>{customersWithDebt}</Text>
          </View>
          <View style={shared.summaryCard}>
            <Text style={shared.summaryCardLabel}>Total Transaksi Hutang</Text>
            <Text style={shared.summaryCardValue}>{debts.length}</Text>
          </View>
        </View>

        {/* Tabel per customer */}
        {customers.map((customer, ci) => (
          <View key={customer.name} style={{ marginBottom: 12 }} wrap={false}>
            {/* Customer header */}
            <View style={{
              flexDirection: "row", justifyContent: "space-between", alignItems: "center",
              backgroundColor: COLORS.primary, padding: 7, borderRadius: 3, marginBottom: 0,
            }}>
              <View>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: COLORS.white }}>
                  {ci + 1}. {customer.name}
                </Text>
                {customer.phone && (
                  <Text style={{ fontSize: 7.5, color: "#bfdbfe" }}>{customer.phone}</Text>
                )}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 7, color: "#bfdbfe" }}>Total Hutang</Text>
                <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.white }}>
                  {formatRp(customer.total)}
                </Text>
              </View>
            </View>

            {/* Tabel hutang customer */}
            <View style={shared.table}>
              <View style={[shared.tableHeader, { backgroundColor: "#1e3a5f", borderRadius: 0 }]}>
                <Text style={[shared.tableHeaderCell, { flex: 2 }]}>Kode Transaksi</Text>
                <Text style={[shared.tableHeaderCell, { flex: 2 }]}>Tanggal</Text>
                <Text style={[shared.tableHeaderCell, { flex: 2, textAlign: "right" }]}>Nilai Asal</Text>
                <Text style={[shared.tableHeaderCell, { flex: 2, textAlign: "right" }]}>Bayar Hutang</Text>
                <Text style={[shared.tableHeaderCell, { flex: 2, textAlign: "right" }]}>Sisa Hutang</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1.5, textAlign: "center" }]}>Status</Text>
              </View>

              {customer.debts.map((debt, di) => {
                let dateLabel = ""
                try { dateLabel = format(new Date(debt.debtDate), "dd MMM yyyy", { locale: idLocale }) } catch {}

                return (
                  <View key={debt.id} style={[shared.tableRow, di % 2 === 1 ? shared.tableRowAlt : {}]}>
                    <Text style={[shared.tableCell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>
                      {debt.transaction.code}
                    </Text>
                    <Text style={[shared.tableCell, { flex: 2 }]}>{dateLabel}</Text>
                    <Text style={[shared.tableCell, shared.tableCellRight, { flex: 2 }]}>
                      {formatRp(Number(debt.originalAmount))}
                    </Text>
                    <Text style={[shared.tableCell, shared.tableCellRight, { flex: 2, color: COLORS.success }]}>
                      {formatRp(Number(debt.paidAmount))}
                    </Text>
                    <Text style={[shared.tableCell, shared.tableCellRight, { flex: 2, color: COLORS.danger, fontFamily: "Helvetica-Bold" }]}>
                      {formatRp(Number(debt.remainingAmount))}
                    </Text>
                    <View style={[{ flex: 1.5, alignItems: "center", justifyContent: "center" }]}>
                      <Text style={[
                        shared.badge,
                        debt.status === "PAID" ? shared.badgeGreen :
                        debt.status === "PARTIAL" ? shared.badgeOrange : shared.badgeRed,
                      ]}>
                        {STATUS_LABELS[debt.status] ?? debt.status}
                      </Text>
                    </View>
                  </View>
                )
              })}

              {/* Subtotal per customer */}
              <View style={[shared.tableTotalRow, { backgroundColor: "#eff6ff" }]}>
                <Text style={[shared.tableTotalCell, { flex: 2 }]}>Subtotal {customer.name}</Text>
                <Text style={[shared.tableTotalCell, { flex: 2 }]} />
                <Text style={[shared.tableTotalCell, shared.tableCellRight, { flex: 2 }]}>
                  {formatRp(customer.debts.reduce((s, d) => s + Number(d.originalAmount), 0))}
                </Text>
                <Text style={[shared.tableTotalCell, shared.tableCellRight, { flex: 2, color: COLORS.success }]}>
                  {formatRp(customer.debts.reduce((s, d) => s + Number(d.paidAmount), 0))}
                </Text>
                <Text style={[shared.tableTotalCell, shared.tableCellRight, { flex: 2, color: COLORS.danger }]}>
                  {formatRp(customer.total)}
                </Text>
                <Text style={[shared.tableTotalCell, { flex: 1.5 }]} />
              </View>
            </View>
          </View>
        ))}

        {/* Grand total */}
        <View style={{
          flexDirection: "row", justifyContent: "space-between", alignItems: "center",
          backgroundColor: COLORS.tableHeader, padding: 10, borderRadius: 4, marginTop: 4,
        }}>
          <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.white }}>
            GRAND TOTAL PIUTANG OUTSTANDING
          </Text>
          <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: "#fbbf24" }}>
            {formatRp(totalOutstanding)}
          </Text>
        </View>

        <PdfFooter storeName={storeName} note="Laporan piutang per tanggal cetak" />
      </Page>
    </Document>
  )
}
