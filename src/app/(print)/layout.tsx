/**
 * Layout khusus halaman cetak.
 * TIDAK render <html>/<body> — root layout sudah menangani itu.
 * Inject CSS print via <style> tag dan override body via className.
 */
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Cetak Nota" }

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      {children}
    </>
  )
}

const PRINT_CSS = `
  /* ── Override body untuk halaman print ── */
  body.print-page {
    margin: 0 !important;
    padding: 0 !important;
    background: #f0f0f0 !important;
    font-family: monospace !important;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 16px !important;
  }

  /* ── Wrapper nota di screen ── */
  .receipt-wrapper {
    background: #fff;
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    border-radius: 4px;
  }

  /* ── Tombol aksi ── */
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

  /* ── Print media ── */
  @media print {
    body, body.print-page {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      display: block !important;
    }
    .print-actions { display: none !important; }
    .receipt-wrapper {
      box-shadow: none !important;
      border-radius: 0 !important;
    }
    /* @page size diset dinamis via JS di ThermalReceipt */
    @page { size: 80mm auto; margin: 0; }
  }
`
