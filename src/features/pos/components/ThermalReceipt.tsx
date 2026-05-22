"use client"

/**
 * ThermalReceipt — komponen nota thermal.
 * Dirender di halaman (print) yang bersih, tanpa Tailwind/dashboard.
 * Menggunakan inline CSS agar kompatibel dengan semua printer thermal.
 */

import { useEffect } from "react"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface TransactionItem {
  id: string
  productName: string
  quantity: number
  sellPrice: number | string
  discountAmount: number | string
  subtotal: number | string
}

interface Transaction {
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
  items: TransactionItem[]
}

interface StoreSettings {
  storeName: string
  storeAddress: string
  storePhone: string
  receiptNote: string
}

interface ThermalReceiptProps {
  transaction: Transaction
  storeSettings: StoreSettings
  logoUrl?: string | null
  receiptWidth?: string // e.g. "58mm", "80mm"
}

function formatRp(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount
  return `Rp ${n.toLocaleString("id-ID")}`
}

function n(v: number | string): number {
  return typeof v === "string" ? parseFloat(v) : v
}

export function ThermalReceipt({
  transaction,
  storeSettings,
  logoUrl,
  receiptWidth = "80mm",
}: ThermalReceiptProps) {
  // Auto-print saat halaman load
  useEffect(() => {
    // Set page width via CSS variable
    document.documentElement.style.setProperty("--receipt-width", receiptWidth)

    // Tunggu gambar logo load sebelum print
    const images = document.querySelectorAll("img")
    if (images.length === 0) {
      setTimeout(() => window.print(), 300)
    } else {
      let loaded = 0
      const total = images.length
      const tryPrint = () => {
        loaded++
        if (loaded >= total) setTimeout(() => window.print(), 200)
      }
      images.forEach((img) => {
        if (img.complete) tryPrint()
        else { img.onload = tryPrint; img.onerror = tryPrint }
      })
    }
  }, [receiptWidth])

  const date = new Date(transaction.transactionDate)
  const dateStr = format(date, "dd/MM/yyyy HH:mm", { locale: idLocale })

  const subtotal = n(transaction.subtotal)
  const discount = n(transaction.discountAmount)
  const packing = n(transaction.packingFee ?? 0)
  const total = n(transaction.totalAmount)
  const paid = n(transaction.paidAmount)
  const change = n(transaction.changeAmount)
  const debt = n(transaction.debtAmount)

  const paymentLabel = transaction.paymentMethod === "CASH" ? "Tunai" : "Transfer"
  const statusLabel =
    transaction.paymentStatus === "PAID"
      ? "LUNAS"
      : transaction.paymentStatus === "PARTIAL"
      ? "SEBAGIAN"
      : "HUTANG"

  // Lebar karakter per baris (58mm ≈ 32 char, 80mm ≈ 48 char)
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
    center: { textAlign: "center", display: "block" },
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
      objectFit: "contain",
    },
    statusBadge: {
      display: "inline-block",
      border: "1px solid #000",
      padding: "1px 6px",
      fontSize: "10px",
      fontWeight: "bold",
      letterSpacing: "1px",
    },
    itemRow: {
      display: "flex",
      justifyContent: "space-between",
      gap: "4px",
    },
    itemLeft: { flex: 1, minWidth: 0 },
    itemRight: { textAlign: "right", whiteSpace: "nowrap" },
    summaryRow: {
      display: "flex",
      justifyContent: "space-between",
    },
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
      textAlign: "center",
      fontSize: receiptWidth === "58mm" ? "9px" : "10px",
      marginTop: "4px",
    },
    printActions: {
      // Hanya tampil di screen, disembunyikan saat print via CSS
    },
  }

  return (
    <>
      {/* Tombol aksi — hanya tampil di screen */}
      <div className="print-actions">
        <button className="btn-print" onClick={() => window.print()}>
          🖨️ Cetak Ulang
        </button>
        <button className="btn-close" onClick={() => window.close()}>
          ✕ Tutup
        </button>
      </div>

      {/* Nota */}
      <div className="receipt-wrapper" style={s.wrapper}>
        {/* Logo */}
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" style={s.logo} />
        )}

        {/* Header toko */}
        <div style={{ textAlign: "center", marginBottom: "4px" }}>
          <span style={{ ...s.bold, fontSize: receiptWidth === "58mm" ? "12px" : "14px" }}>
            {storeSettings.storeName}
          </span>
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
          const itemDisc = n(item.discountAmount)
          const price = n(item.sellPrice)
          const sub = n(item.subtotal)
          return (
            <div key={item.id} style={{ marginBottom: "3px" }}>
              {/* Nama produk */}
              <div style={{ fontWeight: "bold", wordBreak: "break-word" }}>
                {item.productName}
              </div>
              {/* Qty × harga = subtotal */}
              <div style={s.summaryRow}>
                <span>
                  {item.quantity} × {formatRp(price)}
                  {itemDisc > 0 && ` (-${formatRp(itemDisc)})`}
                </span>
                <span style={{ fontWeight: "bold" }}>{formatRp(sub)}</span>
              </div>
            </div>
          )
        })}

        <pre style={s.pre}>{line("-")}</pre>

        {/* Summary */}
        {discount > 0 && (
          <div style={s.summaryRow}>
            <span>Subtotal</span>
            <span>{formatRp(subtotal + discount)}</span>
          </div>
        )}
        {discount > 0 && (
          <div style={s.summaryRow}>
            <span>Diskon</span>
            <span>-{formatRp(discount)}</span>
          </div>
        )}
        {packing > 0 && (
          <div style={s.summaryRow}>
            <span>Biaya Packing</span>
            <span>+{formatRp(packing)}</span>
          </div>
        )}

        <div style={s.totalRow}>
          <span>TOTAL</span>
          <span>{formatRp(total)}</span>
        </div>

        <pre style={s.pre}>{line("-")}</pre>

        <div style={s.summaryRow}>
          <span>Bayar ({paymentLabel})</span>
          <span>{formatRp(paid)}</span>
        </div>
        {change > 0 && (
          <div style={{ ...s.summaryRow, fontWeight: "bold" }}>
            <span>Kembalian</span>
            <span>{formatRp(change)}</span>
          </div>
        )}
        {debt > 0 && (
          <div style={{ ...s.summaryRow, fontWeight: "bold" }}>
            <span>Hutang</span>
            <span>{formatRp(debt)}</span>
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

        {/* Barcode-like footer */}
        <div style={{ textAlign: "center", marginTop: "6px", fontSize: "8px", color: "#999" }}>
          {transaction.code}
        </div>

        {/* Spasi bawah untuk cutter */}
        <div style={{ height: "16px" }} />
      </div>
    </>
  )
}
