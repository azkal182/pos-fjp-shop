# Sprint 11 — Pembelian dengan Hutang & Keuangan Vendor

**Durasi:** Minggu 4–5  
**Goal:** Form pembelian mendukung pembayaran parsial/hutang. Sistem hutang vendor lengkap dengan buku besar, pembayaran FIFO atau per invoice, dan deposit vendor.

**Prasyarat:** Sprint 9–10 selesai.

---

## 11.1 — Update Purchase Flow

### Schema sudah ada dari Sprint 9. Sekarang update service:

- [ ] Update `src/features/purchases/services/purchase.service.ts`:
  - `create()` sekarang terima `paidAmount`, `paymentMethod`
  - Hitung `debtAmount = totalAmount - paidAmount`
  - Jika `debtAmount > 0` → buat `VendorDebt` record
  - Jika `paidAmount > totalAmount` → buat `Deposit` (source=OVERPAY_PURCHASE)
  - Buat `LedgerEntry`: INVOICE DEBIT + PAYMENT_OUT CREDIT
  - Jika ada deposit vendor yang bisa dipakai → tampilkan opsi

### Update PurchaseForm:

- [ ] Tambah section "Pembayaran" di form pembelian:
  - Input nominal bayar (default = total, bisa dikurangi untuk hutang)
  - Select metode bayar (CASH / TRANSFER)
  - Jika ada deposit vendor → tampilkan opsi "Gunakan deposit (Rp X)"
  - Preview: hutang ke vendor = total - bayar
  - Tombol "Simpan" → submit

---

## 11.2 — Vendor Debt Service

- [ ] Buat `src/features/vendors/services/vendor-debt.service.ts`:

  **`getVendorOutstandingDebts(vendorId)`**
  - Ambil semua VendorDebt UNPAID/PARTIAL urut debtDate asc

  **`previewFifoAllocation(vendorId, amount)`**
  - Hitung preview alokasi FIFO tanpa simpan

  **`allocatePaymentFifo(vendorId, amount, paymentMethod, notes)`**
  - Buat VendorPayment header
  - Alokasi FIFO ke VendorDebt
  - Buat VendorDebtPayment per debt
  - Update LedgerEntry

  **`allocatePaymentToInvoice(vendorDebtId, amount, paymentMethod, notes)`**
  - Bayar satu invoice spesifik
  - Buat VendorPayment + VendorDebtPayment
  - Update LedgerEntry

  **`getVendorLedger(vendorId)`**
  - Ambil semua LedgerEntry untuk vendor ini
  - Return ledger dengan running balance (kredit/debit)

  **`getVendorDebtSummary(vendorId)`**
  - Total hutang outstanding, jumlah PO belum lunas, PO terlama

---

## 11.3 — Vendor Debt API

- [ ] Buat `src/app/api/vendor-debts/route.ts`:
  - `GET` — list semua hutang vendor (filter: vendorId, status)

- [ ] Buat `src/app/api/vendor-debts/pay/route.ts`:
  - `POST` — bayar hutang vendor (FIFO atau per invoice)
  - Body: `{ vendorId, amount, paymentMethod, notes, mode: 'fifo' | 'invoice', vendorDebtId? }`

- [ ] Buat `src/app/api/vendor-debts/preview/route.ts`:
  - `POST` — preview alokasi FIFO tanpa simpan

- [ ] Buat `src/app/api/vendors/[id]/ledger/route.ts`:
  - `GET` — buku besar vendor

- [ ] Buat `src/app/api/vendors/[id]/payments/route.ts`:
  - `GET` — riwayat pembayaran ke vendor

---

## 11.4 — UI: Halaman Hutang Vendor

- [ ] Buat `src/features/vendors/components/VendorDebtSummary.tsx`:
  - Total hutang outstanding (merah), jumlah PO belum lunas, PO terlama
  - Mirror dari `CustomerDebtSummary`

- [ ] Buat `src/features/vendors/components/VendorDebtTable.tsx`:
  - Kolom: Kode PO, Tanggal, Original, Terbayar, Sisa, Status, Aksi (Bayar)
  - Tombol "Bayar" per baris → bayar invoice spesifik
  - Tombol "Bayar Semua (FIFO)" di header

- [ ] Buat `src/features/vendors/components/VendorPaymentForm.tsx`:
  - Mode FIFO: input nominal + preview alokasi
  - Mode per invoice: input nominal untuk invoice spesifik
  - Select metode bayar
  - Catatan opsional

- [ ] Buat `src/features/vendors/components/VendorLedger.tsx`:
  - Buku besar vendor: tanggal, keterangan, debit(+), kredit(-), saldo
  - Mirror dari `CustomerLedger`
  - Expandable rows untuk detail alokasi

- [ ] Update halaman `/vendors/[id]` (buat halaman detail vendor):
  - Info vendor
  - `VendorDebtSummary`
  - Tabs: Buku Besar | Hutang per PO | Riwayat Pembayaran

- [ ] Buat `src/app/(dashboard)/vendor-debts/page.tsx`:
  - Global view semua hutang vendor
  - Summary cards: total hutang ke semua vendor, jumlah vendor berpiutang
  - Tabel per vendor dengan tombol bayar

---

## 11.5 — Update Sidebar Navigation

- [ ] Tambah "Hutang Vendor" ke nav config
- [ ] Tambah ke group "Inventori" atau buat group "Keuangan" baru

---

## Checklist Akhir Sprint 11

- [ ] Form pembelian mendukung bayar parsial/hutang
- [ ] VendorDebt terbuat otomatis saat PO tidak lunas
- [ ] Bayar hutang vendor: FIFO dan per invoice berfungsi
- [ ] Buku besar vendor menampilkan semua transaksi keuangan
- [ ] Halaman global hutang vendor berfungsi
- [ ] LedgerEntry terbuat untuk setiap event keuangan vendor
