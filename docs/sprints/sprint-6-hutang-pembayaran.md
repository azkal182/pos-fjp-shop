# Sprint 6 — Hutang & Pembayaran Hutang

**Durasi:** Minggu 7  
**Goal:** Modul hutang lengkap — global view, per-customer, manual payment dengan FIFO preview, aging badge, dan manajemen kategori aging.

**Prasyarat:** Sprint 1–5 selesai. `allocatePaymentFifo()` sudah ada di `debt.service.ts`. Model `DebtAgingCategory` sudah ada di schema dan sudah di-seed.

---

## 6.1 — Debt Aging Service

- [ ] Buat `src/features/debts/services/debt-aging.service.ts`:

  **`getAgingCategories()`**
  - Ambil semua `DebtAgingCategory` dari DB, urut by `order asc`
  - Cache ringan (bisa re-fetch setiap request, data jarang berubah)

  **`classifyDebt(debtDate: Date, categories: DebtAgingCategory[])`**
  - Hitung `daysDiff = differenceInDays(today, debtDate)` (gunakan `date-fns`)
  - Iterasi kategori: cari yang `minDays <= daysDiff && (maxDays === null || daysDiff <= maxDays)`
  - Return: `{ category, daysDiff, color }` atau `null` jika tidak ada kategori yang cocok

  **`classifyDebts(debts: Debt[])`**
  - Batch classify: ambil kategori sekali, classify semua hutang
  - Return array `DebtWithAging[]`

---

## 6.2 — Debt Aging Categories API

- [ ] Buat `src/features/debts/schemas/debt.schema.ts`:
  - `createAgingCategorySchema`:
    - `name`: string, min 1, max 100
    - `minDays`: number int, min 0
    - `maxDays`: number int optional, min 1 (null = tidak terbatas)
    - `color`: string regex hex color `#[0-9a-fA-F]{6}`
    - `order`: number int, min 1
    - Refinement: jika `maxDays` ada, harus `maxDays > minDays`
  - `updateAgingCategorySchema`: semua field optional
  - `debtPaymentSchema`:
    - `customerId`: string cuid
    - `amount`: number, min 1
    - `notes`: string optional

- [ ] Buat `src/app/api/debt-aging-categories/route.ts`:
  - `GET` — list semua aging categories urut by order
  - `POST` — create aging category baru

- [ ] Buat `src/app/api/debt-aging-categories/[id]/route.ts`:
  - `PUT` — update aging category
  - `DELETE` — hapus aging category; cek minimal harus ada 1 kategori tersisa

---

## 6.3 — Debt API

- [ ] Buat `src/app/api/debts/route.ts`:
  - `GET` — list hutang global:
    - Filter: `customerId`, `status` (UNPAID/PARTIAL/PAID), `page`, `limit`
    - Include: customer, transaction (kode saja)
    - Order by: `debtDate asc` (terlama dulu)
    - Setiap debt di-classify aging sebelum di-return
    - Opsional filter `agingCategoryId` — filter berdasarkan hasil klasifikasi aging

- [ ] Buat `src/app/api/debts/[id]/route.ts`:
  - `GET` — detail satu hutang: include customer, transaction (full), payments (include sourceTransaction kode)

- [ ] Buat `src/app/api/debts/pay/route.ts`:
  - `POST` — manual debt payment:
    1. Validasi body dengan `debtPaymentSchema`
    2. Cek customer ada dan aktif
    3. Cek customer punya hutang outstanding
    4. Panggil `allocatePaymentFifo(customerId, amount, undefined, notes)`
    5. Return `AllocationResult` (detail alokasi per hutang)
    6. Log `[DEBT]` info: customerId, amount, jumlah hutang yang terkena

- [ ] Tambahkan endpoint preview (opsional tapi direkomendasikan):
  - `POST /api/debts/preview` — body: `{ customerId, amount }` → return `FifoPreview` tanpa menyimpan

---

## 6.4 — Debt UI Components

- [ ] Buat `src/features/debts/components/DebtAgingBadge.tsx`:
  - Props: `debtDate: Date`, `categories?: DebtAgingCategory[]`
  - Hitung aging via `classifyDebt()`
  - Tampilkan badge dengan warna dari `category.color` dan label `category.name`
  - Tampilkan juga "(X hari)" di samping nama kategori
  - Jika tidak ada kategori yang cocok → badge abu "Tidak Dikategorikan"

- [ ] Buat `src/features/debts/components/FifoAllocationPreview.tsx`:
  - Props: `preview: FifoPreview | null`, `isLoading: boolean`
  - Loading skeleton saat fetch preview
  - Tabel: Transaksi Asal, Tanggal Hutang, Aging, Sisa Hutang, Dialokasikan, Status Setelah
  - Baris lunas → background hijau muda + teks "LUNAS"
  - Baris partial → background kuning muda + teks "Sisa Rp X"
  - Footer: "Total Dialokasikan: Rp X" + "Sisa Kembalian: Rp X" (jika ada)

- [ ] Buat `src/features/debts/components/DebtPaymentForm.tsx`:
  - Props: `customerId`, `customerName`, `onSuccess`
  - React Hook Form + Zod resolver
  - Field: nominal pembayaran (Rupiah), catatan (opsional)
  - Real-time preview: saat nominal berubah (debounce 500ms) → fetch `/api/debts/preview` → tampilkan `FifoAllocationPreview`
  - Tombol "Konfirmasi Pembayaran" → POST ke `/api/debts/pay`
  - Loading state saat submit
  - Setelah berhasil: toast sukses + panggil `onSuccess()`

- [ ] Buat `src/features/debts/components/DebtTable.tsx`:
  - Props: `customerId?` (jika ada → filter per customer, jika tidak → global view)
  - Kolom: Customer (jika global), Transaksi Asal (kode, link), Tanggal Hutang, `DebtAgingBadge`, Original, Terbayar, Sisa, Status (StatusBadge)
  - Filter (jika global view): customer search, status, aging category
  - Gunakan `DataTable` + `Pagination`

- [ ] Buat `src/features/debts/components/AgingCategoryManager.tsx`:
  - Tabel aging categories: nama, min hari, max hari, warna (preview dot), urutan, aksi (edit/hapus)
  - Form create/edit dalam Dialog: nama, min hari, max hari, color picker (input hex), urutan
  - Konfirmasi sebelum hapus
  - Digunakan di halaman Settings (Sprint 8)

---

## 6.5 — Debt Pages

- [ ] Buat `src/app/(dashboard)/debts/page.tsx`:
  - `PageWrapper` dengan judul "Hutang"
  - Summary cards di atas: Total Outstanding (semua customer), Jumlah Customer Berpiutang, Hutang Terlama (X hari)
  - `DebtTable` global view dengan filter lengkap
  - Tombol "Bayar Hutang" per baris → buka `DebtPaymentForm` dalam Dialog (pre-fill customerId)

- [ ] Buat `src/app/(dashboard)/debts/[customerId]/page.tsx`:
  - Info customer: nama, phone, link ke halaman detail customer
  - `CustomerDebtSummary` — ringkasan hutang
  - `DebtTable` filtered by customerId
  - Tombol "Bayar Hutang" → buka `DebtPaymentForm` dalam Dialog/Sheet
  - Setelah pembayaran berhasil → refetch tabel + summary

---

## Checklist Akhir Sprint 6

- [ ] Aging badge tampil dengan warna yang benar di semua tampilan hutang
- [ ] Global debt view menampilkan semua hutang outstanding dengan filter
- [ ] Halaman hutang per customer berfungsi
- [ ] Manual debt payment: input nominal → FIFO preview real-time → konfirmasi → tersimpan
- [ ] Setelah pembayaran: `DebtPayment` record terbuat, `Debt` status terupdate
- [ ] CRUD aging categories berfungsi (akan diintegrasikan ke Settings di Sprint 8)
- [ ] Log `[DEBT]` detail muncul saat pembayaran hutang
- [ ] Customer dengan hutang lunas semua → bisa di-nonaktifkan (dari Sprint 3)
