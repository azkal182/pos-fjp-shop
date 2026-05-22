"use client"

/**
 * ThermalReceipt — wrapper halaman print.
 * Auto-print saat load, tampilkan tombol aksi di screen.
 * Inject @page size dinamis sesuai receiptWidth dari DB.
 */

import { useEffect } from "react"
import { ReceiptContent } from "./ReceiptContent"
import type { ReceiptTransaction, ReceiptStoreSettings } from "./ReceiptContent"

interface ThermalReceiptProps {
  transaction: ReceiptTransaction
  storeSettings: ReceiptStoreSettings
  logoUrl?: string | null
  receiptWidth?: string
}

export function ThermalReceipt({
  transaction,
  storeSettings,
  logoUrl,
  receiptWidth = "80mm",
}: ThermalReceiptProps) {
  useEffect(() => {
    // Tambah class ke body agar CSS print layout aktif
    document.body.classList.add("print-page")

    // Set CSS variable untuk lebar tombol aksi di screen
    document.documentElement.style.setProperty("--receipt-width", receiptWidth)

    // Inject @page size dinamis — ini yang mengontrol lebar cetak di printer
    const styleId = "thermal-page-size"
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement("style")
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = `@media print { @page { size: ${receiptWidth} auto; margin: 0; } }`

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

    return () => {
      document.body.classList.remove("print-page")
    }
  }, [receiptWidth])

  return (
    <>
      {/* Tombol aksi — hanya tampil di screen, disembunyikan saat print via CSS */}
      <div className="print-actions">
        <button className="btn-print" onClick={() => window.print()}>
          🖨️ Cetak Ulang
        </button>
        <button className="btn-close" onClick={() => window.close()}>
          ✕ Tutup
        </button>
      </div>

      <div className="receipt-wrapper">
        <ReceiptContent
          transaction={transaction}
          storeSettings={storeSettings}
          logoUrl={logoUrl}
          receiptWidth={receiptWidth}
        />
      </div>
    </>
  )
}
