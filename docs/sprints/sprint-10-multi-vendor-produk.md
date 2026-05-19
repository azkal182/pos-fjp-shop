# Sprint 10 — Multi-Vendor per Produk & Filter

**Durasi:** Minggu 3  
**Goal:** Produk bisa di-supply dari beberapa vendor dengan harga berbeda. Filter produk berdasarkan vendor. Form pembelian otomatis suggest harga dari catalog vendor.

**Prasyarat:** Sprint 9 selesai (schema `ProductVendorPrice` sudah ada).

---

## 10.1 — Product Vendor Price Service & API

- [ ] Buat `src/features/products/services/product-vendor-price.service.ts`:
  - `getVendorPricesForProduct(productId)` — semua vendor + harga untuk produk ini
  - `getProductsForVendor(vendorId)` — semua produk yang pernah dibeli dari vendor ini
  - `upsertVendorPrice(productId, vendorId, buyPrice, isPreferred?)` — create atau update
  - `setPreferredVendor(productId, vendorId)` — set vendor utama, unset yang lain
  - `deleteVendorPrice(productId, vendorId)` — hapus relasi

- [ ] Buat `src/app/api/products/[id]/vendor-prices/route.ts`:
  - `GET` — list semua vendor + harga untuk produk ini
  - `POST` — tambah/update harga vendor untuk produk ini

- [ ] Buat `src/app/api/products/[id]/vendor-prices/[vendorId]/route.ts`:
  - `PUT` — update harga
  - `DELETE` — hapus relasi

- [ ] Update `src/app/api/products/route.ts`:
  - Tambah filter `vendorId` — query via `ProductVendorPrice`

---

## 10.2 — Update PurchaseItemRow

Saat user pilih produk di form pembelian, sistem harus:
1. Cek apakah vendor yang dipilih di form ada di `ProductVendorPrice` untuk produk ini
2. Jika ada → auto-fill harga beli dari catalog
3. Jika tidak ada → gunakan `product.buyPrice` sebagai default
4. Tampilkan badge "Harga dari catalog" atau "Harga manual"

- [ ] Update `PurchaseItemRow` — setelah produk dipilih, fetch harga dari vendor yang aktif di form
- [ ] Tampilkan info: harga catalog vs harga yang diinput (jika berbeda)
- [ ] Setelah PO selesai, update `ProductVendorPrice.buyPrice` dan `lastOrderAt`

---

## 10.3 — UI: Manajemen Vendor per Produk

- [ ] Buat `src/features/products/components/ProductVendorPrices.tsx`:
  - Tabel: Vendor, Harga Beli, Vendor Utama, Terakhir Order, Aksi
  - Tombol "Tambah Vendor" → form pilih vendor + input harga
  - Toggle "Vendor Utama" per baris
  - Tombol hapus relasi

- [ ] Update halaman `/products/[id]` — tambah tab "Vendor & Harga" di samping tab stock movement

---

## 10.4 — Filter Produk by Vendor

- [ ] Update `useProducts` hook — tambah filter `vendorId`
- [ ] Update `ProductTable` — tambah Select "Filter Vendor" di filter bar
- [ ] Update `src/app/api/products/route.ts` — query via `ProductVendorPrice` jika `vendorId` ada

---

## Checklist Akhir Sprint 10

- [ ] Produk bisa punya multiple vendor dengan harga berbeda
- [ ] Form pembelian auto-suggest harga dari catalog vendor
- [ ] Filter produk by vendor berfungsi
- [ ] Halaman detail produk menampilkan semua vendor + harga
- [ ] Setelah PO, catalog harga terupdate otomatis
