import { StyleSheet, Font } from "@react-pdf/renderer"

// ── Warna brand ───────────────────────────────────────────────────────────────
export const COLORS = {
  primary: "#1e40af",       // biru tua
  primaryLight: "#dbeafe",  // biru muda
  secondary: "#374151",     // abu gelap
  muted: "#6b7280",         // abu sedang
  border: "#e5e7eb",        // border tipis
  borderDark: "#d1d5db",    // border sedang
  white: "#ffffff",
  black: "#111827",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
  tableHeader: "#1e3a5f",   // header tabel gelap
  tableRowAlt: "#f8fafc",   // baris alternating
  accent: "#0f172a",        // aksen gelap
}

// ── Shared styles ─────────────────────────────────────────────────────────────
export const shared = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLORS.black,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 40,
    backgroundColor: COLORS.white,
  },

  // Header dokumen
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  docHeaderLeft: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: 3,
  },
  storeInfo: {
    fontSize: 8,
    color: COLORS.muted,
    lineHeight: 1.4,
  },
  docHeaderRight: {
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  docMeta: {
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "right",
    lineHeight: 1.5,
  },

  // Summary cards
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 4,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  summaryCardLabel: {
    fontSize: 7,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  summaryCardValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  summaryCardSub: {
    fontSize: 7,
    color: COLORS.muted,
    marginTop: 2,
  },

  // Section title
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    marginBottom: 6,
    marginTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Tabel
  table: {
    width: "100%",
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.tableHeader,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 2,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  tableRowAlt: {
    backgroundColor: COLORS.tableRowAlt,
  },
  tableCell: {
    fontSize: 8.5,
    color: COLORS.secondary,
  },
  tableCellBold: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
  },
  tableCellMuted: {
    fontSize: 8,
    color: COLORS.muted,
  },
  tableCellRight: {
    textAlign: "right",
  },
  tableCellCenter: {
    textAlign: "center",
  },

  // Total row
  tableTotalRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: COLORS.primaryLight,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.primary,
    marginTop: 2,
  },
  tableTotalCell: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },

  // Footer halaman
  pageFooter: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  pageFooterText: {
    fontSize: 7,
    color: COLORS.muted,
  },

  // Badge / status
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  badgeGreen: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
  },
  badgeRed: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
  },
  badgeOrange: {
    backgroundColor: "#ffedd5",
    color: "#c2410c",
  },
  badgeBlue: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
  },
  badgeGray: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },

  // Divider
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    marginVertical: 8,
  },

  // Info row (label: value)
  infoRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  infoLabel: {
    fontSize: 8,
    color: COLORS.muted,
    width: 100,
  },
  infoValue: {
    fontSize: 8,
    color: COLORS.black,
    flex: 1,
  },
  infoValueBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.black,
    flex: 1,
  },
})

// ── Format helpers ─────────────────────────────────────────────────────────────
export function formatRp(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`
}
