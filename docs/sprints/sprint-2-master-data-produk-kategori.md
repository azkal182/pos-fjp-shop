# Sprint 2 — Master Data: Kategori & Produk

**Durasi:** Minggu 3 (bagian 1)  
**Goal:** CRUD Kategori dan Produk berfungsi penuh dengan validasi, filter, dan tampilan stok.

**Prasyarat:** Sprint 1 selesai — Prisma schema bisnis sudah ada, `withHandler`, `api-response`, shared components tersedia.

---

## 2.1 — Kategori

### Service & API
- [ ] Buat `src/features/categories/schemas/index.ts`:
  - `createCategorySchema`: `name` (string, min 1, max 100)
  - `updateCategorySchema`: sama dengan create (partial tidak perlu karena hanya 1 field)
- [ ] Buat `src/features/categories/services/category.service.ts`:
  - `getAll()` — ambil semua kategori, include `_count: { products: true }` untuk jumlah produk
  - `getById(id)` — ambil satu kategori, throw `NotFoundError` jika tidak ada
  - `create(data)` — cek duplikat nama (throw `ConflictError`), buat kategori
  - `update(id, data)` — cek duplikat nama (exclude id sendiri), update
  - `delete(id)` — cek apakah ada produk aktif yang pakai kategori ini (throw `ConflictError` jika ada), hapus
- [ ] Buat `src/app/api/categories/route.ts`:
  - `GET` — list semua kategori, wrapped `withHandler`
  - `POST` — create kategori, validasi body dengan `createCategorySchema`
- [ ] Buat `src/app/api/categories/[id]/route.ts`:
  - `PUT` — update kategori
  - `DELETE` — hapus kategori

### UI Components
- [ ] Buat `src/features/categories/components/CategoryForm.tsx`:
  - React Hook Form + Zod resolver
  - Field: nama kategori
  - Mode create dan edit (props: `defaultValues?`, `onSubmit`, `isLoading`)
  - Render di dalam shadcn `Dialog`
- [ ] Buat `src/features/categories/components/CategoryTable.tsx`:
  - Kolom: Nama, Jumlah Produk, Aksi (Edit | Hapus)
  - Tombol Edit → buka `CategoryForm` dalam dialog (mode edit)
  - Tombol Hapus → buka `ConfirmDialog`
  - Gunakan `DataTable` dari shared components

### Page
- [ ] Buat `src/app/(dashboard)/categories/page.tsx`:
  - Header: judul "Kategori" + tombol "Tambah Kategori"
  - `SearchInput` untuk filter nama (opsional, karena data biasanya sedikit)
  - `CategoryTable` dengan data dari API
  - Dialog create/edit terintegrasi
  - Invalidate/refetch setelah create/update/delete

---

## 2.2 — Produk

### Types & Schema
- [ ] Buat `src/features/products/types/product.types.ts`:
  - `ProductWithCategory` — Product + relasi Category
  - `ProductListFilter` — `search?`, `categoryId?`, `isActive?`, `page?`, `limit?`
- [ ] Buat `src/features/products/schemas/product.schema.ts`:
  - `createProductSchema`:
    - `code`: string, min 1, max 50 (SKU/barcode)
    - `name`: string, min 1, max 200
    - `categoryId`: string cuid
    - `unit`: string, min 1 (pcs, kg, box, dll)
    - `buyPrice`: number, min 0
    - `sellPrice`: number, min 0
    - `minStock`: number int, min 0, default 0
    - `isActive`: boolean, default true
    - Validasi: `sellPrice >= buyPrice` (warn, bukan error keras)
  - `updateProductSchema`: semua field optional kecuali validasi tetap berlaku
  - **Catatan: field `stock` tidak ada di schema — stok hanya bisa berubah via purchase/adjustment**

### Service & API
- [ ] Buat `src/features/products/services/product.service.ts`:
  - `getAll(filter)` — query dengan filter search (name/code ILIKE), categoryId, isActive; include category; pagination; order by name asc
  - `getById(id)` — include category + `_count` stock movements; throw `NotFoundError` jika tidak ada
  - `create(data)` — cek duplikat `code` (throw `ConflictError`), buat produk
  - `update(id, data)` — cek duplikat `code` (exclude id sendiri), update; **jangan izinkan update field `stock` langsung**
  - `softDelete(id)` — set `isActive = false`; log `[PRODUCT]` info
- [ ] Buat `src/app/api/products/route.ts`:
  - `GET` — list produk dengan query params: `search`, `categoryId`, `isActive`, `page`, `limit`
  - `POST` — create produk
- [ ] Buat `src/app/api/products/[id]/route.ts`:
  - `GET` — detail produk
  - `PUT` — update produk
  - `DELETE` — soft delete (set `isActive = false`)

### Hooks
- [ ] Buat `src/features/products/hooks/useProducts.ts`:
  - State: `filters`, `data`, `isLoading`, `error`
  - Actions: `setFilter()`, `refetch()`
  - Fetch otomatis saat filter berubah (dengan debounce untuk search)

### UI Components
- [ ] Buat `src/features/products/components/StockBadge.tsx`:
  - Props: `stock: number`, `minStock: number`
  - Jika `stock === 0` → badge merah "Habis"
  - Jika `stock <= minStock` → badge kuning "Stok Rendah (X)"
  - Jika `stock > minStock` → badge hijau "X"
- [ ] Buat `src/features/products/components/ProductForm.tsx`:
  - React Hook Form + Zod resolver
  - Fields: kode (SKU), nama, kategori (Select dari API), unit, harga beli, harga jual, min stok, status aktif
  - **Tidak ada field stok** — tampilkan note "Stok dikelola via Pembelian & Penyesuaian"
  - Mode create dan edit
  - Render di dalam shadcn `Dialog` atau `Sheet`
- [ ] Buat `src/features/products/components/ProductTable.tsx`:
  - Kolom: Kode, Nama, Kategori, Harga Beli, Harga Jual, Stok (dengan `StockBadge`), Status, Aksi (Edit | Nonaktifkan)
  - Filter bar di atas tabel: `SearchInput`, filter Kategori (Select), filter Status (Select)
  - Gunakan `DataTable` dari shared components
  - Pagination terintegrasi

### Pages
- [ ] Buat `src/app/(dashboard)/products/page.tsx`:
  - `PageWrapper` dengan judul "Produk" + tombol "Tambah Produk"
  - `ProductTable` dengan semua filter
  - Dialog create/edit terintegrasi
- [ ] Buat `src/app/(dashboard)/products/[id]/page.tsx`:
  - Detail produk: semua info (kode, nama, kategori, harga, stok, status)
  - `StockBadge` untuk stok saat ini
  - Tabel riwayat stock movement untuk produk ini (ambil dari `/api/stock-movements?productId=...`)
  - Tombol Edit → buka form edit

---

## Checklist Akhir Sprint 2

- [ ] CRUD Kategori berfungsi — create, edit, delete (dengan guard jika ada produk)
- [ ] CRUD Produk berfungsi — create, edit, soft delete
- [ ] Filter produk: search by nama/kode, filter kategori, filter status aktif
- [ ] `StockBadge` tampil dengan warna yang benar
- [ ] Stok tidak bisa diedit langsung dari form produk
- [ ] Pagination berfungsi di tabel produk
- [ ] Halaman detail produk menampilkan info lengkap
