import { View, Text } from "@react-pdf/renderer"
import { shared } from "./styles"

interface PdfFooterProps {
  storeName: string
  note?: string
}

export function PdfFooter({ storeName, note }: PdfFooterProps) {
  return (
    <View style={shared.pageFooter} fixed>
      <Text style={shared.pageFooterText}>
        {storeName} — Dokumen ini digenerate secara otomatis oleh sistem
        {note ? ` · ${note}` : ""}
      </Text>
      <Text
        style={shared.pageFooterText}
        render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages}`}
      />
    </View>
  )
}
