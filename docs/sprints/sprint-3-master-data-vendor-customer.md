# Sprint 3 — Master Data: Vendor & Customer

**Durasi:** Minggu 3 (bagian 2)  
**Goal:** CRUD Vendor dan Customer berfungsi penuh. Halaman detail customer menampilkan riwayat transaksi dan ringkasan hutang.

**Prasyarat:** Sprint 1 & 2 selesai.

---

## 3.1 — Vendor

### Schema & Service
- [ ] Buat `src/features/vendors/schemas/index.ts`:
  - `createVendorSchema`:
    - `name`: string, min 1, max 200
    - `phone`: string optional, max 20
    - `address`: string optional, max 500
    - `isActive`: boolean, default true
  - `updateVendorSchema`: semua field optional
- [ ] Buat `src/features/vendors/services/vendor.service.ts`:
  - `getAll(filter)` — filter: `search` (name ILIKE), `isActive`; order by name asc
  - `getById(id)` — throw `NotFoundError` jika tidak ada
  - `create(data)` — buat vendor baru
  - `update(id, data)` — update vendor
  - `softDelete(id)` — set `isActive = false`; cek apakah ada purchase aktif (opsional warning)

### API Routes
- [ ] Buat `src/app/api/vendors/route.ts`:
  - `GET` — list vendor, query params: `search`, `isActive`
  - `POST` — create vendor
- [ ] Buat `src/app/api/vendors/[id]/route.ts`:
  - `PUT` — update vendor
  - `DELETE` — soft delete

### UI Components
- [ ] Buat `src/features/vendors/components/VendorForm.tsx`:
  - Fields: nama, phone, alamat, status aktif
  - Mode create dan edit
  - Render di dalam shadcn `Dialog`
- [ ] Buat `src/features/vendors/components/VendorTable.tsx`:
  - Kolom: Nama, Phone, Alamat, Status, Aksi (Edit | Nonaktifkan)
  - Filter: `SearchInput`, filter Status
  - Gunakan `DataTable` dari shared components

### Page
- [ ] Buat `src/app/(dashboard)/vendors/page.tsx`:
  - `PageWrapper` dengan judul "Vendor" + tombol "Tambah Vendor"
  - `VendorTable` dengan filter
  - Dialog create/edit terintegrasi

---

## 3.2 — Customer

### Schema & Service
- [ ] Buat `src/features/customers/schemas/customer.schema.ts`:
  - `createCustomerSchema`:
    - `name`: string, min 1, max 200
    - `phone`: string optional, max 20
    - `address`: string optional, max 500
    - `isActive`: boolean, default true
  - `updateCustomerSchema`: semua field optional
- [ ] Buat `src/features/customers/services/customer.service.ts`:
  - `getAll(filter)` — filter: `search` (name/phone ILIKE), `isActive`; include `_count debts` untuk total hutang; pagination
  - `getById(id)` — include recent transactions (5 terakhir) + debt summary; throw `NotFoundError`
  - `create(data)` — buat customer baru
  - `update(id, data)` — update customer
  - `softDelete(id)`:
    - Cek apakah customer punya hutang dengan status `UNPAID` atau `PARTIAL`
    - Jika ada → throw `ConflictError` dengan pesan "Customer masih memiliki hutang aktif"
    - Jika tidak ada → set `isActive = false`
  - `getDebtSummary(customerId)` — hitung total outstanding, jumlah hutang aktif, hutang terlama

### API Routes
- [ ] Buat `src/app/api/customers/route.ts`:
  - `GET` — list customer, query params: `search`, `isActive`, `page`, `limit`
  - `POST` — create customer
- [ ] Buat `src/app/api/customers/[id]/route.ts`:
  - `GET` — detail customer
  - `PUT` — update customer
  - `DELETE` — soft delete (dengan guard hutang aktif)
- [ ] Buat `src/app/api/customers/[id]/debts/route.ts`:
  - `GET` — debt summary per customer: total outstanding, jumlah hutang, list hutang aktif dengan aging info

### UI Components
- [ ] Buat `src/features/customers/components/CustomerForm.tsx`:
  - Fields: nama, phone, alamat, status aktif
  - Mode create dan edit
  - Render di dalam shadcn `Dialog`
- [ ] Buat `src/features/customers/components/CustomerDebtSummary.tsx`:
  - Props: `customerId`
  - Tampilkan: total hutang outstanding (format Rupiah), jumlah hutang aktif, hutang terlama (berapa hari)
  - Warna merah jika ada hutang outstanding
  - Loading skeleton saat fetch
- [ ] Buat `src/features/customers/components/CustomerTable.tsx`:
  - Kolom: Nama, Phone, Total Hutang Outstanding (merah jika > 0), Status, Aksi (Detail | Edit | Nonaktifkan)
  - Filter: `SearchInput`, filter Status
  - Klik nama/detail → navigasi ke halaman detail customer
  - Gunakan `DataTable` dari shared components

### Pages
- [ ] Buat `src/app/(dashboard)/customers/page.tsx`:
  - `PageWrapper` dengan judul "Customer" + tombol "Tambah Customer"
  - `CustomerTable` dengan filter dan pagination
  - Dialog create/edit terintegrasi
- [ ] Buat `src/app/(dashboard)/customers/[id]/page.tsx`:
  - Info customer: nama, phone, alamat, status
  - `CustomerDebtSummary` — ringkasan hutang
  - Tab atau section:
    - **Riwayat Transaksi**: tabel transaksi customer (kode, tanggal, total, status bayar) — link ke detail transaksi
    - **Hutang Aktif**: tabel hutang outstanding — link ke halaman hutang customer
  - Tombol Edit customer

---

## Checklist Akhir Sprint 3

- [ ] CRUD Vendor berfungsi — create, edit, soft delete
- [ ] CRUD Customer berfungsi — create, edit, soft delete
- [ ] Soft delete customer ditolak jika masih ada hutang aktif (pesan error jelas)
- [ ] Halaman detail customer menampilkan info + riwayat transaksi + ringkasan hutang
- [ ] `CustomerDebtSummary` menampilkan total outstanding dengan warna merah
- [ ] Filter dan pagination berfungsi di semua tabel
