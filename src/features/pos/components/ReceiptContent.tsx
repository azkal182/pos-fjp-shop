"use client"

/**
 * ReceiptContent — pure render nota thermal.
 * Layout berbasis CSS flexbox, bukan char-counting.
 * Kompatibel dengan semua lebar printer thermal (58mm / 80mm).
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
  depositUsed?: number | string | null
  depositCreated?: number | string | null
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
  return `Rp\u00a0${num.toLocaleString("id-ID")}`
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

  const subtotal  = toNum(transaction.subtotal)
  const discount  = toNum(transaction.discountAmount)
  const packing   = toNum(transaction.packingFee ?? 0)
  const total     = toNum(transaction.totalAmount)
  const paid      = toNum(transaction.paidAmount)
  const change    = toNum(transaction.changeAmount)
  const debt      = toNum(transaction.debtAmount)
  const depositUsed = toNum(transaction.depositUsed ?? 0)
  const depositCreated = toNum(transaction.depositCreated ?? 0)

  const paymentLabel = transaction.paymentMethod === "CASH" ? "Tunai" : "Transfer"
  const statusLabel  =
    transaction.paymentStatus === "PAID"    ? "LUNAS"
    : transaction.paymentStatus === "PARTIAL" ? "SEBAGIAN"
    : "HUTANG"

  const is58 = receiptWidth === "58mm"
  const fs   = is58 ? "10px" : "11px"
  const fsXs = is58 ? "9px"  : "10px"
  const fsSm = is58 ? "11px" : "12px"

  // ── Shared styles ──────────────────────────────────────────────
  const base: React.CSSProperties = {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: fs,
    lineHeight: "1.5",
    color: "#000",
    margin: 0,
    padding: 0,
  }

  const wrapper: React.CSSProperties = {
    ...base,
    width: "100%",
    maxWidth: receiptWidth,
    padding: "6px 8px",
    background: "#fff",
    boxSizing: "border-box",
  }

  // Separator: border CSS, bukan char repeat
  const sep = (style: "solid" | "dashed" = "solid"): React.CSSProperties => ({
    borderTop: `1px ${style} #000`,
    margin: "4px 0",
  })

  // Row kiri-kanan dengan flexbox
  const row: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "4px",
    fontSize: fs,
    lineHeight: "1.5",
  }

  const rowLabel: React.CSSProperties = {
    whiteSpace: "nowrap",
    flexShrink: 0,
  }

  const rowValue: React.CSSProperties = {
    textAlign: "right",
    wordBreak: "break-word",
  }

  return (
    <div style={wrapper}>

      {/* ── Logo ── */}
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt="Logo"
          style={{
            display: "block",
            maxWidth: "55%",
            maxHeight: "52px",
            margin: "0 auto 4px",
            objectFit: "contain",
          }}
        />
      )}

      {/* ── Header toko ── */}
      <div style={{ textAlign: "center", marginBottom: "4px" }}>
        <div style={{ fontWeight: "bold", fontSize: is58 ? "12px" : "14px" }}>
          {storeSettings.storeName}
        </div>
        {storeSettings.storeAddress && (
          <div style={{ fontSize: fsXs, marginTop: "1px" }}>
            {storeSettings.storeAddress}
          </div>
        )}
        {storeSettings.storePhone && (
          <div style={{ fontSize: fsXs }}>
            Telp: {storeSettings.storePhone}
          </div>
        )}
      </div>

      <div style={sep("solid")} />

      {/* ── Info transaksi ── */}
      <div style={{ ...row }}><span style={rowLabel}>No</span><span style={rowValue}>{transaction.code}</span></div>
      <div style={{ ...row }}><span style={rowLabel}>Tgl</span><span style={rowValue}>{dateStr}</span></div>
      <div style={{ ...row }}><span style={rowLabel}>Kasir</span><span style={rowValue}>{transaction.user.name}</span></div>
      {transaction.customer && (
        <div style={{ ...row }}><span style={rowLabel}>Customer</span><span style={rowValue}>{transaction.customer.name}</span></div>
      )}

      <div style={sep("dashed")} />

      {/* ── Items ── */}
      {transaction.items.map((item) => {
        const itemDisc = toNum(item.discountAmount)
        const price    = toNum(item.sellPrice)
        const sub      = toNum(item.subtotal)
        return (
          <div key={item.id} style={{ marginBottom: "4px" }}>
            <div style={{ fontWeight: "bold", fontSize: fs, wordBreak: "break-word" }}>
              {item.productName}
            </div>
            <div style={row}>
              <span style={{ ...rowLabel, fontWeight: "normal", fontSize: fsXs }}>
                {item.quantity}&nbsp;×&nbsp;{formatRp(price)}
                {itemDisc > 0 && <>&nbsp;(-{formatRp(itemDisc)})</>}
              </span>
              <span style={{ ...rowValue, fontWeight: "bold" }}>{formatRp(sub)}</span>
            </div>
          </div>
        )
      })}

      <div style={sep("dashed")} />

      {/* ── Summary ── */}
      {(discount > 0 || packing > 0) && (
        <>
          <div style={row}>
            <span style={rowLabel}>Subtotal</span>
            <span style={rowValue}>{formatRp(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div style={row}>
              <span style={rowLabel}>Diskon</span>
              <span style={rowValue}>-{formatRp(discount)}</span>
            </div>
          )}
        </>
      )}
      {packing > 0 && (
        <div style={row}>
          <span style={rowLabel}>Biaya Packing</span>
          <span style={rowValue}>+{formatRp(packing)}</span>
        </div>
      )}

      {/* Total — lebih tebal */}
      <div style={{
        ...row,
        fontWeight: "bold",
        fontSize: fsSm,
        borderTop: "1.5px solid #000",
        borderBottom: "1.5px solid #000",
        padding: "3px 0",
        margin: "3px 0",
      }}>
        <span>TOTAL</span>
        <span>{formatRp(total)}</span>
      </div>

      {/* ── Pembayaran ── */}
      <div style={row}>
        <span style={rowLabel}>Bayar ({paymentLabel})</span>
        <span style={rowValue}>{formatRp(paid)}</span>
      </div>
      {depositUsed > 0 && (
        <div style={row}>
          <span style={rowLabel}>Deposit Dipakai</span>
          <span style={rowValue}>{formatRp(depositUsed)}</span>
        </div>
      )}
      {change > 0 && (
        <div style={{ ...row, fontWeight: "bold" }}>
          <span style={rowLabel}>Kembalian</span>
          <span style={rowValue}>{formatRp(change)}</span>
        </div>
      )}
      {debt > 0 && (
        <div style={{ ...row, fontWeight: "bold" }}>
          <span style={rowLabel}>Hutang</span>
          <span style={rowValue}>{formatRp(debt)}</span>
        </div>
      )}
      {depositCreated > 0 && (
        <div style={{ ...row, fontWeight: "bold" }}>
          <span style={rowLabel}>Deposit Disimpan</span>
          <span style={rowValue}>{formatRp(depositCreated)}</span>
        </div>
      )}

      <div style={sep("solid")} />

      {/* ── Status badge ── */}
      <div style={{ textAlign: "center", margin: "5px 0" }}>
        <span style={{
          display: "inline-block",
          border: "1.5px solid #000",
          padding: "2px 10px",
          fontSize: fs,
          fontWeight: "bold",
          letterSpacing: "1.5px",
        }}>
          [ {statusLabel} ]
        </span>
      </div>

      {/* ── Catatan struk ── */}
      {storeSettings.receiptNote && (
        <div style={{ textAlign: "center", fontSize: fsXs, marginTop: "4px", lineHeight: "1.4" }}>
          {storeSettings.receiptNote}
        </div>
      )}

      <div style={{ textAlign: "center", fontSize: fsXs, marginTop: "6px", color: "#555" }}>
        Terima kasih atas kunjungan Anda
      </div>

      {/* ── Kode transaksi footer ── */}
      <div style={{ textAlign: "center", marginTop: "6px", fontSize: "8px", color: "#999" }}>
        {transaction.code}
      </div>

      {/* Spasi cutter */}
      <div style={{ height: "12px" }} />
    </div>
  )
}
