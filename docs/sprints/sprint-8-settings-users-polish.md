# Sprint 8 — Settings, Users & Polish

**Durasi:** Minggu 9  
**Goal:** Konfigurasi toko, manajemen user, low stock alert terintegrasi, semua edge case tertangani, dan aplikasi siap production.

**Prasyarat:** Sprint 1–7 selesai. Semua fitur utama sudah berjalan.

---

## 8.1 — Settings

### Service & API
- [ ] Buat `src/features/settings/services/settings.service.ts`:
  - `getAll()` — ambil semua settings, group by `group`
  - `getByGroup(group: SettingGroup)` — ambil settings per group
  - `getByKey(key: string)` — ambil satu setting by key
  - `update(updates: { key: string; value: string }[])` — upsert batch: untuk setiap key, update jika ada, create jika belum ada
  - `getStoreSettings()` — helper: return `{ storeName, storeAddress, storePhone, receiptNote }`
  - `getPosSettings()` — helper: return `{ paymentMethods: string[] }`

- [ ] Buat `src/app/api/settings/route.ts`:
  - `GET` — return semua settings grouped: `{ STORE: {...}, POS: {...}, REPORT: {...} }`
  - `PUT` — body: array `{ key, value }[]`, panggil `update()`, return settings terbaru

### UI Components
- [ ] Buat `src/features/settings/components/StoreSettings.tsx`:
  - React Hook Form
  - Fields:
    - Nama Toko (`store_name`)
    - Alamat (`store_address`) — Textarea
    - No. HP (`store_phone`)
    - Catatan Struk (`store_receipt_note`) — Textarea, tampil di receipt
  - Auto-load nilai dari API saat mount
  - Tombol "Simpan" → PUT ke `/api/settings`
  - Toast sukses/gagal

- [ ] Buat `src/features/settings/components/PosSettings.tsx`:
  - Fields:
    - Metode Bayar Tersedia: checkbox group (CASH, TRANSFER) — simpan sebagai `pos_payment_methods = "CASH,TRANSFER"`
  - Auto-load dari API
  - Tombol "Simpan"

- [ ] Buat `src/features/settings/components/AgingSettings.tsx`:
  - Embed `AgingCategoryManager` dari `src/features/debts/components/AgingCategoryManager.tsx`
  - Tambahkan penjelasan singkat: "Kategori aging digunakan untuk mengklasifikasikan hutang berdasarkan umur"

### Page
- [ ] Buat `src/app/(dashboard)/settings/page.tsx`:
  - `PageWrapper` dengan judul "Pengaturan"
  - shadcn `Tabs`: Toko | POS | Aging Hutang
  - Tab Toko → `StoreSettings`
  - Tab POS → `PosSettings`
  - Tab Aging Hutang → `AgingSettings`

### Integrasi Settings ke Fitur Lain
- [ ] Update `src/features/pos/components/Receipt.tsx` — ambil `storeName`, `storeAddress`, `storePhone`, `receiptNote` dari settings API (atau dari store/context)
- [ ] Update `src/features/pos/components/PaymentModal.tsx` — tampilkan hanya metode bayar yang aktif di settings
- [ ] Buat `src/stores/settings.store.ts` — Zustand store untuk cache settings (fetch sekali saat app load)

---

## 8.2 — Users

### Schema & Service
- [ ] Buat `src/features/users/schemas/user.schema.ts`:
  - `createUserSchema`:
    - `name`: string, min 1, max 200
    - `email`: string email
    - `password`: string, min 8
  - `updateUserSchema`:
    - `name`: string optional
    - `email`: string email optional

- [ ] Buat `src/features/users/services/user.service.ts`:
  - `getAll()` — ambil semua user dari tabel `user` (Better Auth)
  - `getById(id)` — throw `NotFoundError` jika tidak ada
  - `create(data)` — buat user via Better Auth admin API atau langsung ke DB dengan password di-hash
  - `update(id, data)` — update name/email
  - `delete(id)` — hapus user; cek tidak bisa hapus diri sendiri; cek minimal 1 user tersisa

- [ ] Buat `src/app/api/users/route.ts`:
  - `GET` — list semua user
  - `POST` — create user baru

- [ ] Buat `src/app/api/users/[id]/route.ts`:
  - `GET` — detail user
  - `PUT` — update user
  - `DELETE` — hapus user (dengan guard)

### UI Components
- [ ] Buat `src/features/users/components/UserForm.tsx`:
  - Mode create: fields nama, email, password
  - Mode edit: fields nama, email (tanpa password)
  - Render di dalam Dialog

- [ ] Buat `src/features/users/components/UserTable.tsx`:
  - Kolom: Nama, Email, Tanggal Dibuat, Aksi (Edit | Hapus)
  - Baris user yang sedang login → disable tombol hapus + tooltip "Tidak bisa hapus akun sendiri"
  - Gunakan `DataTable`

### Page
- [ ] Buat `src/app/(dashboard)/users/page.tsx`:
  - `PageWrapper` dengan judul "Pengguna" + tombol "Tambah Pengguna"
  - `UserTable`
  - Dialog create/edit terintegrasi

---

## 8.3 — Low Stock Alert (Integrasi)

- [ ] Update `src/app/(dashboard)/products/page.tsx`:
  - Tambahkan banner/alert di atas tabel jika ada produk dengan `stock <= minStock`
  - Contoh: "⚠️ 3 produk memiliki stok di bawah minimum. [Lihat]" → filter tabel ke produk stok rendah
  - Tombol "Lihat" → set filter `lowStock = true`

- [ ] Update `src/features/products/services/product.service.ts`:
  - Tambahkan filter `lowStock: boolean` di `getAll()` — query `stock <= minStock`

- [ ] Update `src/app/api/products/route.ts`:
  - Tambahkan query param `lowStock=true`

---

## 8.4 — Error Handling & Edge Cases

- [ ] Review semua API routes — pastikan semua error tertangani oleh `withHandler`
- [ ] Pastikan semua Prisma errors (unique constraint, foreign key) di-map ke response yang tepat di `handleApiError()`
- [ ] Tambahkan validasi di `processCheckout()`:
  - Stok produk cukup untuk semua item (cek sebelum transaksi dimulai)
  - Jika stok tidak cukup → throw `ValidationError` dengan detail produk mana yang kurang
- [ ] Tambahkan validasi di `create purchase`:
  - Produk yang dibeli harus `isActive = true`
  - Vendor harus `isActive = true`
- [ ] Pastikan semua `prisma.$transaction` menggunakan timeout yang wajar
- [ ] Review semua form — pastikan error message dari API ditampilkan ke user (bukan hanya console)
- [ ] Tambahkan `not-found.tsx` yang proper untuk route dinamis (`/products/[id]`, `/customers/[id]`, dll)

---

## 8.5 — UI Polish & Konsistensi

- [ ] Review semua halaman — pastikan `PageWrapper` digunakan konsisten
- [ ] Pastikan semua tabel kosong menampilkan `EmptyState` yang informatif
- [ ] Pastikan semua loading state menggunakan skeleton atau `LoadingSpinner`
- [ ] Pastikan semua aksi destructive (hapus, nonaktifkan) menggunakan `ConfirmDialog`
- [ ] Pastikan format Rupiah konsisten di seluruh aplikasi (gunakan `CurrencyDisplay` atau `formatRupiah`)
- [ ] Pastikan semua tanggal menggunakan format Indonesia (gunakan `date-fns` dengan locale `id`)
- [ ] Review responsivitas — minimal bisa digunakan di tablet (768px)
- [ ] Pastikan semua form memiliki label yang jelas dan pesan error yang informatif
- [ ] Tambahkan `title` metadata yang tepat untuk setiap halaman

---

## 8.6 — Log Audit Final

- [ ] Pastikan semua context log sudah terpasang:
  - `[AUTH]` — login attempt, logout, session validation failure
  - `[API]` — setiap request (sudah di `withHandler`)
  - `[POS]` — checkout berhasil, walk-in debt attempt rejected
  - `[DEBT]` — FIFO allocation detail
  - `[PURCHASE]` — barang masuk, price change detected/confirmed
  - `[STOCK]` — setiap pergerakan stok
  - `[SETTING]` — perubahan konfigurasi
- [ ] Pastikan tidak ada `console.log` yang tertinggal — semua pakai `log.*`
- [ ] Test log di production mode (tanpa pino-pretty) — pastikan output JSON valid

---

## 8.7 — Final Checklist Sebelum Production

- [ ] `bun run build` berhasil tanpa error TypeScript
- [ ] `bun run lint` tidak ada error ESLint
- [ ] Semua env variable terdokumentasi di `.env.example`
- [ ] `README.md` diupdate: cara setup, cara run, cara seed
- [ ] Prisma migrations semua sudah di-commit
- [ ] Tidak ada hardcoded credential atau secret di kode
- [ ] Semua route API sudah diproteksi auth (via `withHandler` + session check)
- [ ] Test manual flow utama:
  - [ ] Login → Dashboard
  - [ ] Tambah kategori → tambah produk
  - [ ] Tambah vendor → buat pembelian → cek stok bertambah
  - [ ] Tambah customer → buat transaksi POS (lunas) → cek stok berkurang
  - [ ] Buat transaksi POS (partial) → cek hutang terbentuk
  - [ ] Bayar hutang manual → cek FIFO berjalan benar
  - [ ] Overpay di POS dengan hutang lama → cek alokasi otomatis
  - [ ] Cek semua laporan menampilkan data yang benar
  - [ ] Ubah settings toko → cek receipt terupdate

---

## Checklist Akhir Sprint 8

- [ ] Settings toko, POS, dan aging hutang bisa dikonfigurasi dan tersimpan
- [ ] Receipt menggunakan nama toko dari settings
- [ ] User management berfungsi (CRUD)
- [ ] Low stock alert tampil di halaman produk
- [ ] Semua edge case tertangani dengan pesan error yang jelas
- [ ] Build production berhasil tanpa error
- [ ] Semua log context terpasang dengan benar
