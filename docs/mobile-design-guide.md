# Mobile Design Guide — POS FJP Shop

Panduan ini ditujukan untuk tim desain mobile yang akan membuat prototipe atau desain UI/UX untuk aplikasi POS. Konten mencakup semua API yang tersedia di project, termasuk endpoint yang sudah terdokumentasi di `app_spec.md` dan endpoint tambahan yang ada di codebase.

## 1. Konteks Umum

Project ini adalah aplikasi POS dengan fitur:
- autentikasi Better Auth
- master data produk, kategori, vendor, customer
- pembelian stok dan stock movement
- transaksi kasir (draft + confirm + cancel)
- hutang customer dan vendor + alokasi FIFO
- deposit customer/vendor
- laporan penjualan, produk, hutang, profit
- pengaturan toko dan POS
- upload gambar dan proxy image

## 2. Format API Umum

Semua endpoint API mengembalikan struktur standar:

```json
{
  "success": true,
  "data": ...,
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Jika gagal:

```json
{
  "success": false,
  "error": "Pesan error"
}
```

> Perhatikan bahwa `meta` hanya ada pada response paginasi.

## 3. Autentikasi

- `GET /api/auth/[...all]`
- `POST /api/auth/[...all]`

Autentikasi dikelola oleh Better Auth. Untuk desain mobile, anggap login, logout, dan refresh session mengikuti flow Better Auth.

## 4. Dashboard

- `GET /api/dashboard`

Response berisi ringkasan utama dashboard: penjualan, transaksi, hutang, stok rendah, grafik, dan rangkuman.

### Mobile flow
- Card utama: total penjualan hari ini / minggu / bulan
- Statistik transaksi hari ini
- Outstanding hutang customer/vendor
- Produk stok rendah
- Grafik penjualan 30 hari terakhir
- Ringkasan produk terlaris

## 5. Kategori

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

### Mobile screens
- List kategori
- Tambah kategori
- Edit kategori
- Hapus kategori

## 6. Produk

- `GET /api/products`  
  Query: `search`, `categoryId`, `isActive`, `lowStock`, `page`, `limit`
- `POST /api/products`
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

### Vendor prices
- `GET /api/products/:id/vendor-prices`
- `POST /api/products/:id/vendor-prices`
- `GET /api/products/:id/vendor-prices/:vendorId`
- `PUT /api/products/:id/vendor-prices/:vendorId`
- `DELETE /api/products/:id/vendor-prices/:vendorId`

### Payload penting
`POST /api/products`
```json
{
  "code": "SKU001",
  "name": "Produk A",
  "categoryId": "...",
  "vendorId": "...",
  "unit": "pcs",
  "buyPrice": 10000,
  "sellPrice": 12000,
  "minStock": 5,
  "isActive": true
}
```

`PUT /api/products/:id`
- bisa mengubah `code`, `name`, `categoryId`, `unit`, `buyPrice`, `sellPrice`, `minStock`, `isActive`

### Mobile flow
- List produk dengan filter kategori dan low stock
- Pencarian produk cepat (search by name/code)
- Detail produk
- Form edit produk
- Form tambah produk
- Integrasi vendor price management dalam detail produk

## 7. Vendor

- `GET /api/vendors`  
  Query: `search`, `isActive`
- `POST /api/vendors`
- `GET /api/vendors/:id`
- `PUT /api/vendors/:id`
- `DELETE /api/vendors/:id`

### Vendor detail tambahan
- `GET /api/vendors/:id/debts`
- `GET /api/vendors/:id/deposit`
- `GET /api/vendors/:id/ledger`
- `POST /api/vendors/:id/ledger`  (recalculate ledger, internal maintenance)
- `GET /api/vendors/:id/payments`

### Vendor debt global
- `GET /api/vendor-debts`
  Query: `vendorId`, `status`, `page`, `limit`
- `GET /api/vendor-debts/summary`
- `POST /api/vendor-debts/preview`
- `POST /api/vendor-debts/pay`

### Payload untuk pembayaran vendor
`POST /api/vendor-debts/pay`
```json
{
  "vendorId": "...",
  "amount": 500000,
  "paymentMethod": "CASH",
  "mode": "fifo",          
  "vendorDebtId": "...",   
  "notes": "Pembayaran hutang"
}
```

- `mode`: `fifo` untuk alokasi otomatis ke hutang terlama, `invoice` untuk bayar invoice tertentu.

### Mobile flow
- List vendor
- Vendor detail dengan ringkasan hutang + deposit
- Pembayaran hutang vendor dengan preview FIFO
- Tab ledger dan payment history

## 8. Customer

- `GET /api/customers`  
  Query: `search`, `isActive`, `page`, `limit`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`

### Customer detail tambahan
- `GET /api/customers/:id/debts`
- `GET /api/customers/:id/deposit`
- `GET /api/customers/:id/ledger`
- `GET /api/customers/:id/payments`

### Mobile flow
- List customer dengan pencarian
- Detail customer dengan ringkasan hutang
- Riwayat transaksi dan pembayaran customer
- Tombol bayar hutang customer

## 9. Purchases (Barang masuk)

- `GET /api/purchases`
  Query: `vendorId`, `dateFrom`, `dateTo`, `page`, `limit`
- `POST /api/purchases`
- `GET /api/purchases/:id`
- `POST /api/purchases/detect-price-changes`

### Payload pembelian
`POST /api/purchases`
```json
{
  "vendorId": "...",
  "purchaseDate": "2026-06-02",
  "items": [
    { "productId": "...", "quantity": 10, "buyPrice": 9000 }
  ],
  "notes": "Pembelian bahan baku",
  "confirmedPriceUpdates": ["product-id-1"],
  "paidAmount": 100000,
  "paymentMethod": "TRANSFER",
  "receiptImageUrl": "https://..."
}
```

### Detect price changes
- `POST /api/purchases/detect-price-changes`
- Body: `{ "items": [{ "productId":"...", "buyPrice": 9500 }] }`
- Response: daftar perubahan harga beli per produk

### Mobile flow
- Pilih vendor
- Tambah item pembelian
- Tampilkan alert jika harga beli berubah
- Pilih apakah update harga beli produk
- Simpan pembelian → stok bertambah → stock movement tercatat

## 10. Stock Movements

- `GET /api/stock-movements`
  Query: `productId`, `search`, `type`, `dateFrom`, `dateTo`, `page`, `limit`
- `POST /api/stock-movements/adjust`

### Payload adjustment stock
`POST /api/stock-movements/adjust`
```json
{
  "productId": "...",
  "type": "ADJUSTMENT_IN",   
  "quantity": 5,
  "notes": "Penyesuaian stok"
}
```

- Validasi: `ADJUSTMENT_OUT` tidak boleh membuat stok negatif.

### Mobile flow
- Log stock movement read-only
- Filter by product, tipe, tanggal
- Form adjustment stok manual untuk koreksi

## 11. POS / Transaction Flow

### Endpoint utama
- `GET /api/transactions`
  Query: `customerId`, `paymentStatus`, `confirmationStatus`, `dateFrom`, `dateTo`, `page`, `limit`
- `POST /api/transactions`  (buat draft)
- `GET /api/transactions/:id`
- `PATCH /api/transactions/:id`  (ubah draft)
- `POST /api/transactions/:id/confirm`  (konfirmasi checkout)
- `POST /api/transactions/:id/cancel`  (batalkan draft)

### Draft checkout
`POST /api/transactions`
```json
{
  "customerId": "...",     
  "items": [
    { "productId":"...", "quantity": 2, "sellPrice": 15000, "discountAmount": 0 }
  ],
  "discountAmount": 0,
  "notes": "Penjualan kasir"
}
```

### Update draft
`PATCH /api/transactions/:id`
```json
{
  "items": [ ... ],
  "discountAmount": 1000
}
```

### Konfirmasi transaksi
`POST /api/transactions/:id/confirm`
```json
{
  "paidAmount": 20000,
  "paymentMethod": "CASH",
  "packingFee": 0,
  "overpayAction": "return",   
  "depositUsed": 0,
  "depositId": "...",
  "notes": "Pembayaran penuh"
}
```

- `paidAmount` boleh 0 jika customer terdaftar dan hutang dibolehkan.
- Walk-in customer dengan `paidAmount < totalAmount` tidak diizinkan (harus lunas).
- `overpayAction` bisa `return` atau `deposit` ketika customer bayar kelebihan.
- Deposit digunakan ketika ada credit balance customer.

### Flow checkout mobile
1. Pilih customer (walk-in atau cari customer terdaftar)
2. Tambah produk ke keranjang via search
3. Atur qty, diskon per item
4. Tampilkan ringkasan subtotal, discount, total
5. Tekan Bayar → tampilkan payment sheet
6. Masukkan `paidAmount`, pilih metode bayar
7. Hitung hutang / kembalian / deposit / alokasi FIFO
8. Konfirmasi → POST confirm
9. Tampilkan receipt dan hasil transaksi

### Overpayment / debt allocation
- Jika customer terdaftar dan ada hutang lama: gunakan `POST /api/debts/preview` untuk preview alokasi FIFO
- Jika overpay tapi tidak ada hutang lama, sisa akan dianggap kembalian
- Jika deposit digunakan di transaksi, gunakan `depositId` dan `depositUsed`

## 12. Debt / Hutang Customer

- `GET /api/debts`
  Query: `customerId`, `status`, `agingCategoryId`, `page`, `limit`
- `GET /api/debts/:id`
- `POST /api/debts/pay`
- `POST /api/debts/preview`
- `GET /api/debts/summary`

### Manual debt payment
`POST /api/debts/pay`
```json
{
  "customerId": "...",
  "amount": 100000,
  "notes": "Bayar sebagian hutang"
}
```

- Sistem akan melakukan alokasi FIFO ke hutang tertua.
- Jika ada kelebihan bayar, sisa otomatis disimpan sebagai deposit customer.

### Mobile flow
- List semua hutang outstanding
- Filter berdasarkan aging category
- Detail customer hutang per invoice
- Form bayar hutang dengan preview FIFO
- Tampilkan badge aging berdasarkan rentang hari

## 13. Debt Aging Categories

- `GET /api/debt-aging-categories`
- `POST /api/debt-aging-categories`
- `PUT /api/debt-aging-categories/:id`
- `DELETE /api/debt-aging-categories/:id`

Digunakan untuk menampilkan badge aging hutang:
- `name`, `minDays`, `maxDays`, `color`, `order`

## 14. Deposit

- `GET /api/deposits`
  Query: `partyType`, `partyId`, `activeOnly`
- `GET /api/customers/:id/deposit`
- `GET /api/vendors/:id/deposit`
- `POST /api/deposits/:id/use`
- `POST /api/deposits/:id/return`

### Deposit use
`POST /api/deposits/:id/use`
```json
{
  "amount": 50000,
  "referenceType": "TRANSACTION",
  "referenceId": "trx-id",
  "partyType": "CUSTOMER",
  "partyId": "customer-id"
}
```

### Deposit return
`POST /api/deposits/:id/return`
```json
{
  "amount": 50000,
  "paymentMethod": "TRANSFER",
  "notes": "Kembalikan deposit"
}
```

### Mobile flow
- Lihat saldo deposit customer/vendor
- Gunakan deposit saat checkout
- Kembalikan deposit bila diperlukan

## 15. Reports

- `GET /api/reports/sales`
  Query: `dateFrom`, `dateTo`, `groupBy=day|week|month`
- `GET /api/reports/products`
  Query: `dateFrom`, `dateTo`, `categoryId`
- `GET /api/reports/party-products`
  Query: `type=customer|vendor`, `partyId`, `dateFrom`, `dateTo`
- `GET /api/reports/debts`
- `GET /api/reports/profit`
  Query: `dateFrom`, `dateTo`
- `GET /api/export/report/party-products`
  Query sama seperti `party-products`, menghasilkan PDF
- `GET /api/export/customers/:id/product-history`
  Query: `dateFrom`, `dateTo`; default 30 hari terakhir. PDF berisi riwayat item yang dibeli customer, dengan biaya packing dan diskon transaksi sebagai baris terpisah.
- `GET /api/export/customers/:id/debt-book`
  Query: `dateFrom`, `dateTo`; default 30 hari terakhir. PDF berisi buku hutang customer dengan saldo awal, mutasi tambah/kurangi saldo, dan saldo akhir.

### Mobile flow
- Tampilan filter periode
- Grafik dan ringkasan total
- List produk terlaris
- Rekap produk per customer/vendor dengan kolom tanggal maksimal 1 bulan
- Ringkasan aging hutang
- Profit summary berdasarkan HPP

## 16. Settings

- `GET /api/settings`
- `PUT /api/settings`

Payload update settings:
```json
[
  { "key": "STORE_NAME", "value": "Nama Toko" },
  { "key": "DEFAULT_PAYMENT_METHOD", "value": "CASH" }
]
```

### Mobile flow
- Konfigurasi store information
- Pengaturan metode bayar POS
- Setting cetak / printer / note
- Setting debt aging category

## 17. Media Upload dan Image Proxy

- `POST /api/upload`
  - multipart/form-data
  - field `file`: image
  - field `folder`: optional
  - field `replaceUrl`: optional

Response: `{ success: true, data: { url, key }}`

- `GET /api/image-proxy?url=...`
  - Proxy image untuk memperbolehkan sumber eksternal

### Mobile flow
- Upload logo toko, foto produk, atau struk
- Preview gambar setelah upload
- Gunakan proxy saat mengambil gambar eksternal

## 18. Semua Endpoint API dalam Project

### Core master data
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`
- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/vendors`
- `POST /api/vendors`
- `GET /api/vendors/:id`
- `PUT /api/vendors/:id`
- `DELETE /api/vendors/:id`
- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`

### POS & transaction
- `GET /api/transactions`
- `POST /api/transactions`
- `GET /api/transactions/:id`
- `PATCH /api/transactions/:id`
- `POST /api/transactions/:id/confirm`
- `POST /api/transactions/:id/cancel`

### Purchase & stock
- `GET /api/purchases`
- `POST /api/purchases`
- `GET /api/purchases/:id`
- `POST /api/purchases/detect-price-changes`
- `GET /api/stock-movements`
- `POST /api/stock-movements/adjust`

### Debt & deposit
- `GET /api/debts`
- `GET /api/debts/:id`
- `POST /api/debts/pay`
- `POST /api/debts/preview`
- `GET /api/debts/summary`
- `GET /api/customers/:id/debts`
- `GET /api/customers/:id/deposit`
- `GET /api/customers/:id/ledger`
- `GET /api/customers/:id/payments`
- `GET /api/vendors/:id/debts`
- `GET /api/vendors/:id/deposit`
- `GET /api/vendors/:id/ledger`
- `GET /api/vendors/:id/payments`
- `GET /api/deposits`
- `POST /api/deposits/:id/use`
- `POST /api/deposits/:id/return`

### Vendor debt management
- `GET /api/vendor-debts`
- `GET /api/vendor-debts/summary`
- `POST /api/vendor-debts/preview`
- `POST /api/vendor-debts/pay`

### Price & supplier
- `GET /api/products/:id/vendor-prices`
- `POST /api/products/:id/vendor-prices`
- `GET /api/products/:id/vendor-prices/:vendorId`
- `PUT /api/products/:id/vendor-prices/:vendorId`
- `DELETE /api/products/:id/vendor-prices/:vendorId`

### Reporting
- `GET /api/reports/sales`
- `GET /api/reports/products`
- `GET /api/reports/party-products`
- `GET /api/reports/debts`
- `GET /api/reports/profit`
- `GET /api/export/report/party-products`
- `GET /api/export/customers/:id/product-history`
- `GET /api/export/customers/:id/debt-book`

### Settings & utilities
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/dashboard`
- `POST /api/upload`
- `GET /api/image-proxy`

## 19. Desain Mobile — Flow & Prioritas

### 19.1 POS / Kasir
- Halaman utama: produk + cart + customer select.
- Sidebar/overlay: ringkasan total, diskon, deposit/customer debt.
- Modal pembayaran: `paidAmount`, `paymentMethod`, `tombol konfirmasi`, preview `hutang` atau `kembalian`.
- Setelah confirm: tampilan receipt / success.

### 19.2 Customer & Debt
- Card ringkasan hutang di customer detail.
- Tombol `Bayar Hutang` buka preview FIFO.
- Jika customer punya deposit, tunjukkan saldo deposit.
- Batasi customer nonaktif bila masih punya hutang aktif.

### 19.3 Vendor & Purchase
- Vendor detail: daftar hutang dan deposit vendor.
- Form pembelian: pilih vendor, tambah item, cek price change.
- Harga berubah: tampilkan alert per item.
- History pembelian dan invoice.

### 19.4 Stock movement
- List kronologis stock movement.
- Filter tipe dan tanggal.
- Tampilkan `stockBefore`, `stockAfter`, `referenceCode`.

### 19.5 Laporan & Dashboard
- Ringkasan cards + grafik.
- Filter date range.
- Group By pada sales report.
- Export / PDF flow (jika tersedia nanti).

## 20. Catatan Tambahan

- Endpoint `POST /api/upload` wajib untuk semua upload gambar produk atau toko.
- Endpoint `GET /api/image-proxy` bisa digunakan untuk mem-proxy gambar eksternal.
- Endpoint `POST /api/purchases/detect-price-changes` penting untuk flow pembelian dengan alert harga beli baru.
- Endpoint `POST /api/vendor-debts/preview` dan `POST /api/debts/preview` harus dipakai untuk menampilkan alokasi FIFO sebelum user konfirmasi.
- `transaction.confirm` adalah titik utama checkout dan wajib menangani overpay / underpay / deposit.

---

Dokumen ini dibuat untuk mendukung pembuatan desain mobile dengan referensi API lengkap dan flow yang tersedia di codebase saat ini.
