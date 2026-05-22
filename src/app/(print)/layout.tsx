/**
 * Layout khusus halaman cetak.
 * Tidak ada sidebar, header, atau theme dashboard.
 * Hanya HTML + CSS minimal untuk printer thermal.
 */

interface PrintLayoutProps {
  children: React.ReactNode
}

export default function PrintLayout({ children }: PrintLayoutProps) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Cetak Nota</title>
        <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#fff", fontFamily: "monospace" }}>
        {children}
      </body>
    </html>
  )
}

const PRINT_CSS = `
  /* ── Reset ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Screen: tampilkan preview di tengah ── */
  @media screen {
    body {
      background: #f0f0f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
      min-height: 100vh;
    }
    .receipt-wrapper {
      background: #fff;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      border-radius: 4px;
    }
    .print-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      width: 100%;
      max-width: var(--receipt-width, 80mm);
    }
    .btn-print {
      flex: 1;
      padding: 8px 16px;
      background: #1e40af;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      font-family: sans-serif;
    }
    .btn-print:hover { background: #1d3a9e; }
    .btn-close {
      padding: 8px 16px;
      background: #fff;
      color: #374151;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      font-family: sans-serif;
    }
    .btn-close:hover { background: #f9fafb; }
  }

  /* ── Print: hapus semua chrome ── */
  @media print {
    html, body {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .print-actions { display: none !important; }
    .receipt-wrapper {
      box-shadow: none !important;
      border-radius: 0 !important;
    }
    /*
     * @page size diset via JS di ThermalReceipt berdasarkan receiptWidth dari DB.
     * Default fallback 80mm jika JS belum jalan.
     */
    @page {
      size: 80mm auto;
      margin: 0;
    }
  }
`
