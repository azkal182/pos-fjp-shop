import { View, Text, Image } from "@react-pdf/renderer"
import { shared, COLORS } from "./styles"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface PdfHeaderProps {
  storeName: string
  storeAddress?: string
  storePhone?: string
  logoUrl?: string        // URL logo toko dari R2
  title: string
  subtitle?: string
  period?: string
  printedAt?: Date
  docNumber?: string
}

export function PdfHeader({
  storeName, storeAddress, storePhone, logoUrl,
  title, subtitle, period, printedAt, docNumber,
}: PdfHeaderProps) {
  return (
    <View style={shared.docHeader}>
      {/* Kiri: logo + info toko */}
      <View style={[shared.docHeaderLeft, { flexDirection: "row", alignItems: "flex-start", gap: 8 }]}>
        {logoUrl && (
          <Image
            src={logoUrl}
            style={{ width: 40, height: 40, objectFit: "contain" }}
          />
        )}
        <View style={{ flex: 1 }}>
          <Text style={shared.storeName}>{storeName}</Text>
          {storeAddress && <Text style={shared.storeInfo}>{storeAddress}</Text>}
          {storePhone && <Text style={shared.storeInfo}>Telp: {storePhone}</Text>}
        </View>
      </View>

      {/* Kanan: judul dokumen */}
      <View style={shared.docHeaderRight}>
        <Text style={shared.docTitle}>{title}</Text>
        {subtitle && <Text style={[shared.docMeta, { fontSize: 9, color: "#374151" }]}>{subtitle}</Text>}
        {period && <Text style={shared.docMeta}>Periode: {period}</Text>}
        {docNumber && <Text style={shared.docMeta}>No: {docNumber}</Text>}
        <Text style={shared.docMeta}>
          Dicetak: {format(printedAt ?? new Date(), "dd MMMM yyyy HH:mm", { locale: idLocale })}
        </Text>
      </View>
    </View>
  )
}
