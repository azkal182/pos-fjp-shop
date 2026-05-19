# Sprint 13 — Laporan Keuangan Lanjutan

**Durasi:** Minggu 7–8  
**Goal:** Laporan keuangan komprehensif — arus kas, buku besar, rekonsiliasi, laporan hutang vendor, laporan deposit, dan semua laporan bisa di-export PDF.

**Prasyarat:** Sprint 9–12 selesai. Semua LedgerEntry sudah terisi.

---

## 13.1 — Report Service Lanjutan

- [ ] Update `src/features/reports/services/report.service.ts`:

  **`getCashFlowReport(dateFrom, dateTo)`**
  - Arus kas masuk: sum PAYMENT_IN dari customer
  - Arus kas keluar: sum PAYMENT_OUT ke vendor + DEPOSIT_RETURN ke customer
  - Net cash flow per hari/minggu/bulan
  - Breakdown per kategori (penjualan, pembelian, deposit, dll)

  **`getVendorDebtReport()`**
  - Total hutang ke semua vendor
  - Per vendor: outstanding, jumlah PO, PO terlama
  - Aging hutang vendor (sama seperti aging hutang customer)

  **`getDepositReport()`**
  - Total deposit customer aktif
  - Total deposit vendor aktif
  - Riwayat deposit masuk/keluar per periode

  **`getBalanceSheet(asOf: Date)`**
  - Aset: kas + piutang customer + deposit ke vendor
  - Kewajiban: hutang ke vendor + deposit customer
  - Ekuitas: aset - kewajiban

  **`getIncomeStatement(dateFrom, dateTo)`**
  - Pendapatan: total penjualan (PAID + PARTIAL)
  - HPP: total harga beli produk yang terjual
  - Gross profit: pendapatan - HPP
  - Breakdown per kategori produk

---

## 13.2 — API Laporan Baru

- [ ] `GET /api/reports/cash-flow` — arus kas
- [ ] `GET /api/reports/vendor-debts` — hutang vendor
- [ ] `GET /api/reports/deposits` — laporan deposit
- [ ] `GET /api/reports/balance-sheet` — neraca
- [ ] `GET /api/reports/income-statement` — laba rugi

---

## 13.3 — UI Laporan Baru

- [ ] Update `/reports` page — tambah tabs baru:
  - Arus Kas
  - Hutang Vendor
  - Deposit
  - Neraca (Balance Sheet)
  - Laba Rugi

- [ ] Buat `src/features/reports/components/CashFlowReport.tsx`:
  - Summary: total masuk, total keluar, net
  - Waterfall chart atau stacked bar
  - Tabel detail per hari

- [ ] Buat `src/features/reports/components/VendorDebtReport.tsx`:
  - Summary cards
  - Tabel per vendor dengan aging
  - Bar chart aging bucket

- [ ] Buat `src/features/reports/components/BalanceSheet.tsx`:
  - Layout dua kolom: Aset | Kewajiban + Ekuitas
  - Angka per kategori

- [ ] Buat `src/features/reports/components/IncomeStatement.tsx`:
  - Pendapatan → HPP → Gross Profit → Net Profit
  - Perbandingan periode sebelumnya

---

## 13.4 — Export PDF

- [ ] Install `@react-pdf/renderer`
- [ ] Buat `src/features/reports/pdf/` folder:
  - `InvoicePDF.tsx` — struk penjualan formal
  - `PurchaseInvoicePDF.tsx` — invoice pembelian
  - `SalesReportPDF.tsx` — laporan penjualan
  - `CashFlowPDF.tsx` — laporan arus kas
  - `IncomeStatementPDF.tsx` — laporan laba rugi

- [ ] Buat API routes untuk generate PDF:
  - `GET /api/export/invoice/[id]` → PDF struk
  - `GET /api/export/purchase/[id]` → PDF invoice pembelian
  - `GET /api/export/report/sales` → PDF laporan penjualan
  - `GET /api/export/report/cash-flow` → PDF arus kas
  - `GET /api/export/report/income-statement` → PDF laba rugi

- [ ] Tambah tombol "Export PDF" di setiap halaman laporan
- [ ] Tambah tombol "Download Invoice" di detail transaksi dan detail pembelian

---

## 13.5 — Print Invoice (Halaman Khusus)

- [ ] Buat `src/app/(print)/layout.tsx` — layout minimal tanpa sidebar
- [ ] Buat `src/app/(print)/invoice/[id]/page.tsx` — struk penjualan
- [ ] Buat `src/app/(print)/purchase/[id]/page.tsx` — invoice pembelian
- [ ] CSS `@media print` untuk tampilan bersih
- [ ] Auto-trigger `window.print()` saat halaman load
- [ ] Tombol "Print" dan "Download PDF" di halaman print

---

## Checklist Akhir Sprint 13

- [ ] Laporan arus kas menampilkan data real
- [ ] Laporan hutang vendor berfungsi
- [ ] Neraca dan laba rugi bisa digenerate
- [ ] Export PDF berfungsi untuk semua laporan
- [ ] Halaman print invoice bersih tanpa style aplikasi
- [ ] Tombol download PDF di detail transaksi dan pembelian
