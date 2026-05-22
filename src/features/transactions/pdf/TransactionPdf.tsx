import { Document, Page, View, Text, Image } from "@react-pdf/renderer"
import { shared, COLORS, formatRp } from "@/lib/pdf/styles"
import { PdfFooter } from "@/lib/pdf/PdfFooter"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface TransactionItem {
  id: string
  productName: string
  quantity: number
  sellPrice: number
  buyPrice: number
  discountAmount: number
  subtotal: number
}

interface TransactionPdfProps {
  transaction: {
    id: string
    code: string
    totalAmount: number
    subtotal: number
    discountAmount: number
    packingFee?: number
    paidAmount: number
    changeAmount: number
    debtAmount: number
    paymentMethod: string
    paymentStatus: string
    transactionDate: string
    customer: { name: string; phone?: string | null } | null
    items: TransactionItem[]
  }
  storeName: string
  storeAddress?: string
  storePhone?: string
  storeReceiptNote?: string
  logoUrl?: string
}

const STATUS_LABELS: Record<string, string> = {
  PAID: "LUNAS",
  PARTIAL: "SEBAGIAN",
  UNPAID: "BELUM BAYAR",
}

const STATUS_COLORS: Record<string, string> = {
  PAID: COLORS.success,
  PARTIAL: COLORS.warning,
  UNPAID: COLORS.danger,
}

export function TransactionPdf({
  transaction, storeName, storeAddress, storePhone, storeReceiptNote, logoUrl,
}: TransactionPdfProps) {
  const dateStr = format(new Date(transaction.transactionDate), "dd MMMM yyyy HH:mm", { locale: idLocale })
  const statusColor = STATUS_COLORS[transaction.paymentStatus] ?? COLORS.muted

  return (
    <Document title={`Invoice ${transaction.code} — ${storeName}`} author={storeName}>
      <Page size="A5" style={[shared.page, { paddingHorizontal: 30, paddingTop: 30 }]}>
        {/* Header toko */}
        <View style={{ alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: COLORS.primary }}>
          {logoUrl && (
            <Image src={logoUrl} style={{ width: 48, height: 48, objectFit: "contain", marginBottom: 4 }} />
          )}
          <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: COLORS.primary, marginBottom: 3 }}>
            {storeName}
          </Text>
          {storeAddress && <Text style={{ fontSize: 8, color: COLORS.muted, textAlign: "center" }}>{storeAddress}</Text>}
          {storePhone && <Text style={{ fontSize: 8, color: COLORS.muted }}>Telp: {storePhone}</Text>}
        </View>

        {/* Judul invoice */}
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: COLORS.accent, letterSpacing: 2, textTransform: "uppercase" }}>
            INVOICE / NOTA
          </Text>
        </View>

        {/* Info transaksi */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12, backgroundColor: "#f8fafc", padding: 8, borderRadius: 4, borderWidth: 0.5, borderColor: COLORS.border }}>
          <View>
            <View style={shared.infoRow}>
              <Text style={shared.infoLabel}>No. Transaksi</Text>
              <Text style={[shared.infoValueBold, { color: COLORS.primary }]}>: {transaction.code}</Text>
            </View>
            <View style={shared.infoRow}>
              <Text style={shared.infoLabel}>Tanggal</Text>
              <Text style={shared.infoValue}>: {dateStr}</Text>
            </View>
            <View style={shared.infoRow}>
              <Text style={shared.infoLabel}>Customer</Text>
              <Text style={shared.infoValueBold}>: {transaction.customer?.name ?? "Walk-in"}</Text>
            </View>
            {transaction.customer?.phone && (
              <View style={shared.infoRow}>
                <Text style={shared.infoLabel}>Telepon</Text>
                <Text style={shared.infoValue}>: {transaction.customer.phone}</Text>
              </View>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={{
              backgroundColor: statusColor,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 4,
            }}>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: COLORS.white }}>
                {STATUS_LABELS[transaction.paymentStatus] ?? transaction.paymentStatus}
              </Text>
            </View>
            <Text style={{ fontSize: 7, color: COLORS.muted, marginTop: 4 }}>
              {transaction.paymentMethod === "CASH" ? "Tunai" : "Transfer"}
            </Text>
          </View>
        </View>

        {/* Tabel item */}
        <View style={shared.table}>
          <View style={shared.tableHeader}>
            <Text style={[shared.tableHeaderCell, { flex: 3 }]}>Nama Produk</Text>
            <Text style={[shared.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Qty</Text>
            <Text style={[shared.tableHeaderCell, { flex: 2, textAlign: "right" }]}>Harga</Text>
            <Text style={[shared.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Disc</Text>
            <Text style={[shared.tableHeaderCell, { flex: 2, textAlign: "right" }]}>Subtotal</Text>
          </View>

          {transaction.items.map((item, i) => (
            <View key={item.id} style={[shared.tableRow, i % 2 === 1 ? shared.tableRowAlt : {}]}>
              <Text style={[shared.tableCell, { flex: 3 }]}>{item.productName}</Text>
              <Text style={[shared.tableCell, shared.tableCellCenter, { flex: 1 }]}>{item.quantity}</Text>
              <Text style={[shared.tableCell, shared.tableCellRight, { flex: 2 }]}>{formatRp(item.sellPrice)}</Text>
              <Text style={[shared.tableCell, shared.tableCellRight, { flex: 1, color: item.discountAmount > 0 ? COLORS.danger : COLORS.muted }]}>
                {item.discountAmount > 0 ? formatRp(item.discountAmount) : "—"}
              </Text>
              <Text style={[shared.tableCellBold, shared.tableCellRight, { flex: 2 }]}>{formatRp(item.subtotal)}</Text>
            </View>
          ))}
        </View>

        {/* Kalkulasi total */}
        <View style={{ marginTop: 4, borderTopWidth: 0.5, borderTopColor: COLORS.border }}>
          {/* Subtotal */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 8 }}>
            <Text style={{ fontSize: 8.5, color: COLORS.muted }}>Subtotal</Text>
            <Text style={{ fontSize: 8.5 }}>{formatRp(Number(transaction.subtotal))}</Text>
          </View>

          {/* Diskon */}
          {Number(transaction.discountAmount) > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 8.5, color: COLORS.danger }}>Diskon</Text>
              <Text style={{ fontSize: 8.5, color: COLORS.danger }}>− {formatRp(Number(transaction.discountAmount))}</Text>
            </View>
          )}

          {/* Packing fee */}
          {Number(transaction.packingFee ?? 0) > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 8.5, color: "#0891b2" }}>Biaya Packing</Text>
              <Text style={{ fontSize: 8.5, color: "#0891b2" }}>+ {formatRp(Number(transaction.packingFee))}</Text>
            </View>
          )}

          {/* Total */}
          <View style={{
            flexDirection: "row", justifyContent: "space-between",
            paddingVertical: 7, paddingHorizontal: 8,
            backgroundColor: COLORS.primary, borderRadius: 3, marginTop: 4,
          }}>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.white }}>TOTAL</Text>
            <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: COLORS.white }}>
              {formatRp(Number(transaction.totalAmount))}
            </Text>
          </View>

          {/* Bayar */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 8, marginTop: 2 }}>
            <Text style={{ fontSize: 8.5, color: COLORS.muted }}>
              Dibayar ({transaction.paymentMethod === "CASH" ? "Tunai" : "Transfer"})
            </Text>
            <Text style={{ fontSize: 8.5 }}>{formatRp(Number(transaction.paidAmount))}</Text>
          </View>

          {/* Kembalian */}
          {Number(transaction.changeAmount) > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 8.5, color: COLORS.success, fontFamily: "Helvetica-Bold" }}>Kembalian</Text>
              <Text style={{ fontSize: 8.5, color: COLORS.success, fontFamily: "Helvetica-Bold" }}>
                {formatRp(Number(transaction.changeAmount))}
              </Text>
            </View>
          )}

          {/* Hutang */}
          {Number(transaction.debtAmount) > 0 && (
            <View style={{
              flexDirection: "row", justifyContent: "space-between",
              paddingVertical: 5, paddingHorizontal: 8,
              backgroundColor: "#fef2f2", borderRadius: 3, marginTop: 2,
              borderWidth: 0.5, borderColor: "#fecaca",
            }}>
              <Text style={{ fontSize: 8.5, color: COLORS.danger, fontFamily: "Helvetica-Bold" }}>Sisa Hutang</Text>
              <Text style={{ fontSize: 9, color: COLORS.danger, fontFamily: "Helvetica-Bold" }}>
                {formatRp(Number(transaction.debtAmount))}
              </Text>
            </View>
          )}
        </View>

        {/* Catatan */}
        {storeReceiptNote && (
          <View style={{ marginTop: 12, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: COLORS.border, alignItems: "center" }}>
            <Text style={{ fontSize: 7.5, color: COLORS.muted, textAlign: "center", lineHeight: 1.5 }}>
              {storeReceiptNote}
            </Text>
          </View>
        )}

        <PdfFooter storeName={storeName} />
      </Page>
    </Document>
  )
}
