# Sprint 4 — Pembelian Barang & Stock Movement

**Durasi:** Minggu 4  
**Goal:** Alur pembelian barang masuk berfungsi penuh — multi-item, deteksi perubahan harga, update stok otomatis, dan pencatatan stock movement.

**Prasyarat:** Sprint 1–3 selesai. Model `Purchase`, `PurchaseItem`, `StockMovement` sudah ada di schema.

---

## 4.1 — Stock Movement (Service & API)

Stock movement adalah log read-only. Dibuat otomatis oleh service lain (purchase, transaction), tidak pernah dibuat langsung oleh user.

### Service
- [ ] Buat `src/features/stock-movements/services/stock-movement.service.ts`:
  - `createMovement(tx, data)` — **internal function**, dipanggil di dalam `prisma.$transaction`:
    - Ambil `product.stock` saat ini sebagai `stockBefore`
    - Hitung `stockAfter = stockBefore + quantity` (quantity negatif untuk keluar)
    - Buat `StockMovement` record
    - Update `product.stock` ke `stockAfter`
    - Log `[STOCK]` info: productId, type, qty, stockBefore, stockAfter, referenceCode
  - `getAll(filter)` — filter: `productId`, `type` (enum), `dateFrom`, `dateTo`; include product; pagination; order by createdAt desc

### API
- [ ] Buat `src/app/api/stock-movements/route.ts`:
  - `GET` only — list stock movements dengan filter
  - **Tidak ada POST/PUT/DELETE** — ini adalah read-only audit log

---

## 4.2 — Pembelian (Purchase)

### Schema
- [ ] Buat `src/features/purchases/schemas/purchase.schema.ts`:
  - `purchaseItemSchema`:
    - `productId`: string cuid
    - `quantity`: number int, min 1
    - `buyPrice`: number, min 0
  - `createPurchaseSchema`:
    - `vendorId`: string cuid
    - `purchaseDate`: string datetime (ISO)
    - `items`: array `purchaseItemSchema`, min 1 item
    - `notes`: string optional
    - `confirmedPriceUpdates`: array of `productId` — produk mana yang admin setuju update harganya

### Service
- [ ] Buat `src/features/purchases/services/purchase.service.ts`:

  **`getAll(filter)`**
  - Filter: `vendorId`, `dateFrom`, `dateTo`; include vendor + `_count items`; pagination; order by purchaseDate desc

  **`getById(id)`**
  - Include: vendor, items (include product), user; throw `NotFoundError` jika tidak ada

  **`detectPriceChanges(items)`** — helper function:
  - Untuk setiap item, ambil `product.buyPrice` saat ini dari DB
  - Bandingkan dengan `buyPrice` yang diinput
  - Return array: `{ productId, productName, previousBuyPrice, newBuyPrice, changed: boolean }`

  **`create(data, userId)`** — dalam satu `prisma.$transaction`:
  1. Generate kode `PO-YYYYMMDD-XXXX` via `generateCode('PO')`
  2. Hitung `totalAmount = sum(item.quantity * item.buyPrice)`
  3. Buat `Purchase` record
  4. Untuk setiap item:
     - Ambil `product.buyPrice` saat ini
     - Set `priceChanged = (currentBuyPrice !== inputBuyPrice)`
     - Set `previousBuyPrice = currentBuyPrice`
     - Buat `PurchaseItem` record
  5. Untuk setiap item: panggil `createMovement(tx, { productId, type: 'PURCHASE_IN', quantity: +item.quantity, referenceCode: purchase.code, purchaseId: purchase.id })`
  6. Untuk setiap item yang ada di `confirmedPriceUpdates`: update `product.buyPrice` ke `item.buyPrice`
  7. Log `[PURCHASE]` info: kode PO, vendorId, jumlah item, total amount
  8. Untuk setiap item dengan `priceChanged`: log `[PURCHASE]` warn: productId, previousBuyPrice, newBuyPrice, apakah dikonfirmasi update

### API Routes
- [ ] Buat `src/app/api/purchases/route.ts`:
  - `GET` — list pembelian dengan filter
  - `POST` — create pembelian baru (termasuk update stok + deteksi harga)
- [ ] Buat `src/app/api/purchases/[id]/route.ts`:
  - `GET` — detail pembelian

### UI Components

- [ ] Buat `src/features/purchases/components/PriceChangeAlert.tsx`:
  - Props: `changes: PriceChange[]`, `onConfirm(confirmedIds: string[])`, `onSkip()`
  - Tampilkan tabel: Produk, Harga Lama, Harga Baru
  - Checkbox per produk untuk memilih mana yang akan diupdate
  - Tombol "Update Harga yang Dipilih" dan "Lewati Semua"
  - Render di dalam shadcn `AlertDialog` atau `Dialog`

- [ ] Buat `src/features/purchases/components/PurchaseItemRow.tsx`:
  - Satu baris item di form pembelian
  - Props: `index`, `onRemove`
  - Fields: pilih produk (combobox search), qty, harga beli
  - Tampilkan harga beli saat ini dari produk yang dipilih (sebagai referensi)
  - Auto-hitung subtotal baris

- [ ] Buat `src/features/purchases/components/PurchaseForm.tsx`:
  - React Hook Form + Zod resolver
  - Fields:
    - Pilih vendor (Select/Combobox dari API)
    - Tanggal pembelian (DatePicker)
    - Catatan (Textarea, opsional)
    - Dynamic list item: tombol "Tambah Item" → append `PurchaseItemRow`
    - Tampilkan total keseluruhan (auto-hitung)
  - Flow submit:
    1. Submit form → panggil `detectPriceChanges` di client (atau dari response API)
    2. Jika ada perubahan harga → tampilkan `PriceChangeAlert`
    3. Setelah admin memilih → submit final dengan `confirmedPriceUpdates`
  - Loading state saat submit

- [ ] Buat `src/features/purchases/components/PurchaseTable.tsx`:
  - Kolom: Kode PO, Vendor, Tanggal, Jumlah Item, Total Amount, Aksi (Detail)
  - Filter: vendor (Select), date range (`DateRangePicker`)
  - Gunakan `DataTable` + `Pagination`

### Pages
- [ ] Buat `src/app/(dashboard)/purchases/page.tsx`:
  - `PageWrapper` dengan judul "Pembelian" + tombol "Pembelian Baru"
  - `PurchaseTable` dengan filter
- [ ] Buat `src/app/(dashboard)/purchases/new/page.tsx`:
  - `PageWrapper` dengan judul "Pembelian Baru" + tombol "Kembali"
  - `PurchaseForm` full page (bukan dialog, karena form kompleks)
  - Setelah berhasil → redirect ke `/purchases` dengan toast sukses

---

## 4.3 — Stock Movement UI

### UI Component
- [ ] Buat `src/features/stock-movements/components/StockMovementTable.tsx`:
  - Kolom: Produk, Tipe (badge warna per tipe), Qty (+ hijau / − merah), Stok Sebelum, Stok Sesudah, Referensi (kode PO/TRX), Tanggal
  - Filter: produk (search/select), tipe (Select enum), date range
  - Gunakan `DataTable` + `Pagination`

### Page
- [ ] Buat `src/app/(dashboard)/stock-movements/page.tsx`:
  - `PageWrapper` dengan judul "Pergerakan Stok"
  - `StockMovementTable` dengan semua filter
  - **Tidak ada tombol tambah** — ini read-only

---

## Checklist Akhir Sprint 4

- [ ] Form pembelian bisa tambah multiple item secara dinamis
- [ ] Sistem mendeteksi perubahan harga beli dan menampilkan `PriceChangeAlert`
- [ ] Admin bisa memilih produk mana yang harganya diupdate
- [ ] Setelah pembelian: stok produk bertambah sesuai qty
- [ ] `StockMovement` record terbuat otomatis dengan type `PURCHASE_IN`
- [ ] Halaman stock movement menampilkan log dengan filter lengkap
- [ ] Detail pembelian menampilkan semua item + info vendor
- [ ] Log `[PURCHASE]` dan `[STOCK]` muncul di console saat pembelian
