"use client"

/**
 * ReceiptContent — pure render nota thermal.
 * Tidak ada auto-print, tidak ada tombol aksi.
 * Dipakai oleh ThermalReceipt (halaman print) dan ReceiptPreview (settings).
 */

import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

export interface ReceiptTransaction {
  id: string
  code: string
  subtotal: number | string
  discountAmount: number | string
  packingFee?: number | string | null
  totalAmount: number | string
  paidAmount: number | string
  changeAmount: number | string
  debtAmount: number | string
  paymentMethod: string
  paymentStatus: string
  transactionDate: string | Date
  customer: { name: string; phone?: string | null } | null
  user: { name: string }
  items: {
    id: string
    productName: string
    quantity: number
    sellPrice: number | string
    discountAmount: number | string
    subtotal: number | string
  }[]
}

export interface ReceiptStoreSettings {
  storeName: string
  storeAddress: string
  storePhone: string
  receiptNote: string
}

export interface ReceiptContentProps {
  transaction: ReceiptTransaction
  storeSettings: ReceiptStoreSettings
  logoUrl?: string | null
  receiptWidth?: string
}

function formatRp(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return `Rp ${num.toLocaleString("id-ID")}`
}

function toNum(v: number | string): number {
  return typeof v === "string" ? parseFloat(v) : v
}

export function ReceiptContent({
  transaction,
  storeSettings,
  logoUrl,
  receiptWidth = "80mm",
}: ReceiptContentProps) {
  const date = new Date(transaction.transactionDate)
  const dateStr = format(date, "dd/MM/yyyy HH:mm", { locale: idLocale })

  const subtotal = toNum(transaction.subtotal)
  const discount = toNum(transaction.discountAmount)
  const packing = toNum(transaction.packingFee ?? 0)
  const total = toNum(transaction.totalAmount)
  const paid = toNum(transaction.paidAmount)
  const change = toNum(transaction.changeAmount)
  const debt = toNum(transaction.debtAmount)

  const paymentLabel = transaction.paymentMethod === "CASH" ? "Tunai" : "Transfer"
  const statusLabel =
    transaction.paymentStatus === "PAID"
      ? "LUNAS"
      : transaction.paymentStatus === "PARTIAL"
      ? "SEBAGIAN"
      : "HUTANG"

  const charWidth = receiptWidth === "58mm" ? 32 : 48
  const fontSize = receiptWidth === "58mm" ? "10px" : "11px"

  function line(char = "-") {
    return char.repeat(charWidth)
  }

  function twoCol(left: string, right: string, width = charWidth): string {
    const maxLeft = width - right.length - 1
    const l = left.length > maxLeft ? left.slice(0, maxLeft - 1) + "…" : left
    const spaces = width - l.length - right.length
    return l + " ".repeat(Math.max(1, spaces)) + right
  }

  const s: Record<string, React.CSSProperties> = {
    wrapper: {
      width: receiptWidth,
      maxWidth: receiptWidth,
      fontFamily: "'Courier New', Courier, monospace",
      fontSize,
      lineHeight: "1.4",
      color: "#000",
      padding: "8px 6px",
      background: "#fff",
    },
    bold: { fontWeight: "bold" },
    pre: {
      fontFamily: "inherit",
      fontSize: "inherit",
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
      margin: 0,
    },
    logo: {
      display: "block",
      maxWidth: "60%",
      maxHeight: "48px",
      margin: "0 auto 4px",
      objectFit: "contain" as const,
    },
    statusBadge: {
      display: "inline-block",
      border: "1px solid #000",
      padding: "1px 6px",
      fontSize: "10px",
      fontWeight: "bold",
      letterSpacing: "1px",
    },
    row: { display: "flex", justifyContent: "space-between" },
    totalRow: {
      display: "flex",
      justifyContent: "space-between",
      fontWeight: "bold",
      fontSize: receiptWidth === "58mm" ? "11px" : "12px",
      borderTop: "1px solid #000",
      paddingTop: "2px",
      marginTop: "2px",
    },
    note: {
      textAlign: "center" as const,
      fontSize: receiptWidth === "58mm" ? "9px" : "10px",
      marginTop: "4px",
    },
  }

  return (
    <div style={s.wrapper}>
      {/* Logo */}
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="Logo" style={s.logo} />
      )}

      {/* Header toko */}
      <div style={{ textAlign: "center", marginBottom: "4px" }}>
        <div style={{ ...s.bold, fontSize: receiptWidth === "58mm" ? "12px" : "14px" }}>
          {storeSettings.storeName}
        </div>
        {storeSettings.storeAddress && (
          <div style={{ fontSize: receiptWidth === "58mm" ? "9px" : "10px", marginTop: "1px" }}>
            {storeSettings.storeAddress}
          </div>
        )}
        {storeSettings.storePhone && (
          <div style={{ fontSize: receiptWidth === "58mm" ? "9px" : "10px" }}>
            Telp: {storeSettings.storePhone}
          </div>
        )}
      </div>

      <pre style={s.pre}>{line("=")}</pre>

      {/* Info transaksi */}
      <pre style={s.pre}>{twoCol("No:", transaction.code)}</pre>
      <pre style={s.pre}>{twoCol("Tgl:", dateStr)}</pre>
      <pre style={s.pre}>{twoCol("Kasir:", transaction.user.name)}</pre>
      {transaction.customer && (
        <pre style={s.pre}>{twoCol("Customer:", transaction.customer.name)}</pre>
      )}

      <pre style={s.pre}>{line("-")}</pre>

      {/* Items */}
      {transaction.items.map((item) => {
        const itemDisc = toNum(item.discountAmount)
        const price = toNum(item.sellPrice)
        const sub = toNum(item.subtotal)
        return (
          <div key={item.id} style={{ marginBottom: "3px" }}>
            <div style={s.bold}>{item.productName}</div>
            <div style={s.row}>
              <span>
                {item.quantity} × {formatRp(price)}
                {itemDisc > 0 && ` (-${formatRp(itemDisc)})`}
              </span>
              <span style={s.bold}>{formatRp(sub)}</span>
            </div>
          </div>
        )
      })}

      <pre style={s.pre}>{line("-")}</pre>

      {/* Summary */}
      {discount > 0 && (
        <>
          <div style={s.row}><span>Subtotal</span><span>{formatRp(subtotal + discount)}</span></div>
          <div style={s.row}><span>Diskon</span><span>-{formatRp(discount)}</span></div>
        </>
      )}
      {packing > 0 && (
        <div style={s.row}><span>Biaya Packing</span><span>+{formatRp(packing)}</span></div>
      )}

      <div style={s.totalRow}>
        <span>TOTAL</span>
        <span>{formatRp(total)}</span>
      </div>

      <pre style={s.pre}>{line("-")}</pre>

      <div style={s.row}>
        <span>Bayar ({paymentLabel})</span>
        <span>{formatRp(paid)}</span>
      </div>
      {change > 0 && (
        <div style={{ ...s.row, fontWeight: "bold" }}>
          <span>Kembalian</span><span>{formatRp(change)}</span>
        </div>
      )}
      {debt > 0 && (
        <div style={{ ...s.row, fontWeight: "bold" }}>
          <span>Hutang</span><span>{formatRp(debt)}</span>
        </div>
      )}

      <pre style={s.pre}>{line("=")}</pre>

      {/* Status */}
      <div style={{ textAlign: "center", margin: "4px 0" }}>
        <span style={s.statusBadge}>[ {statusLabel} ]</span>
      </div>

      {/* Catatan */}
      {storeSettings.receiptNote && (
        <div style={s.note}>{storeSettings.receiptNote}</div>
      )}

      <div style={{ ...s.note, marginTop: "8px", color: "#666" }}>
        Terima kasih atas kunjungan Anda
      </div>

      <div style={{ textAlign: "center", marginTop: "6px", fontSize: "8px", color: "#999" }}>
        {transaction.code}
      </div>

      <div style={{ height: "16px" }} />
    </div>
  )
}
