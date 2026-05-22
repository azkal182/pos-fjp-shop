# APP_SPEC — POS FJP Shop

## 1. Deskripsi Aplikasi

POS FJP Shop adalah sistem Point of Sale berbasis web untuk toko retail. Aplikasi ini mengelola seluruh siklus operasional toko mulai dari pembelian barang masuk (purchasing), penjualan (POS/kasir), manajemen hutang piutang (customer & vendor), hingga pelaporan keuangan.

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL + Prisma v7 |
| Auth | Better Auth (cookie-based session + bearer token) |
| Language | TypeScript |
| Validation | Zod |

### Base URL

```
{BASE_URL}/api
```

### Authentication

Semua endpoint (kecuali `/api/auth/*`) memerlukan autentikasi. Kirim session cookie atau Bearer token di header `Authorization`.

### Response Format

Semua response menggunakan format JSON konsisten:

```typescript
// Success (single)
interface ApiResponse<T> {
  success: true
  data: T
}

// Success (paginated)
interface PaginatedResponse<T> {
  success: true
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Error
interface ErrorResponse {
  success: false
  error: string
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Validation Error |
| 401 | Unauthorized |
| 404 | Not Found |
| 409 | Conflict (duplicate/state error) |
| 500 | Internal Server Error |

---

## 2. Alur Bisnis

### 2.1 Alur Pembelian (Purchasing)

```
Pilih Vendor → Input Items + Qty + Harga Beli
  → Deteksi Perubahan Harga (otomatis)
  → Bayar (Lunas / Hutang ke Vendor)
  → Stok Bertambah (PURCHASE_IN)
  → Jika hutang: VendorDebt tercatat
```

### 2.2 Alur Penjualan (POS) — Two-Step: Draft → Confirm

```
Step 1: Buat Draft
  Kasir pilih produk → Masukkan ke cart → Simpan sebagai DRAFT
  → Stok di-reserve (reservedStock bertambah)
  → Transaksi status: DRAFT, paymentStatus: UNPAID

Step 2: Konfirmasi & Bayar
  Buka draft → Input pembayaran (paidAmount, paymentMethod, packingFee)
  → Konfirmasi transaksi
  → Stok dikurangi (SALE_OUT), reservedStock dilepas
  → Status: CONFIRMED
  → Jika bayar < total: Debt tercatat (piutang customer)
  → Jika bayar > total: Kembalian atau Deposit customer
  → Jika ada deposit customer: Bisa dipakai untuk bayar

Pembatalan Draft:
  Draft bisa dibatalkan → reservedStock dikembalikan → Status: CANCELLED
```

### 2.3 Alur Hutang Customer (Piutang)

```
Transaksi dengan hutang → Debt record tercatat
  → Customer bayar hutang (DIRECT payment)
  → Alokasi FIFO (hutang terlama dilunasi duluan)
  → Jika overpay: sisa jadi Deposit customer
  → Ledger entry tercatat
```

### 2.4 Alur Hutang ke Vendor

```
Purchase dengan hutang → VendorDebt record tercatat
  → Toko bayar ke vendor (FIFO atau per-invoice)
  → Jika overpay: sisa jadi Deposit vendor
  → Ledger entry tercatat
```

### 2.5 Alur Deposit

```
Deposit terbentuk dari:
  - Overpay transaksi customer (OVERPAY_TRANSACTION)
  - Overpay purchase ke vendor (OVERPAY_PURCHASE)
  - Manual

Deposit bisa:
  - Digunakan untuk bayar transaksi/hutang berikutnya
  - Dikembalikan (return) ke pemilik
```

### 2.6 Alur Stok

```
Stok bertambah: Purchase (PURCHASE_IN), Adjustment (ADJUSTMENT_IN)
Stok berkurang: Sale (SALE_OUT), Adjustment (ADJUSTMENT_OUT)
Reserved: Draft transaction me-reserve stok (tidak bisa dijual ke orang lain)
Available stock = stock - reservedStock
```

---

## 3. API Documentation

### 3.1 Auth

#### POST /api/auth/sign-in/email
Login dengan email & password.

**Request Body:**
```json
{
  "email": "admin@fjpshop.com",
  "password": "admin123456"
}
```

**Response:** Session object dari Better Auth (set cookie otomatis).

#### POST /api/auth/sign-out
Logout dan hapus session.

#### GET /api/auth/get-session
Ambil session aktif.

---

### 3.2 Categories

#### GET /api/categories
List semua kategori.

**Response:**
```typescript
ApiResponse<{
  id: string
  name: string
  createdAt: string
  updatedAt: string
}[]>
```

#### POST /api/categories
Buat kategori baru.

**Request Body:**
```json
{ "name": "Makanan" }
```

**Response:** `ApiResponse<Category>` (201)

#### PUT /api/categories/:id
Update kategori.

**Request Body:**
```json
{ "name": "Minuman" }
```

#### DELETE /api/categories/:id
Hapus kategori.

---

### 3.3 Products

#### GET /api/products
List produk dengan pagination & filter.

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Halaman |
| limit | number | 20 | Per halaman |
| search | string | - | Cari nama/kode |
| categoryId | string | - | Filter kategori |
| vendorId | string | - | Filter vendor |
| isActive | boolean | - | Filter status |
| lowStock | boolean | false | Hanya stok rendah |

**Response:**
```typescript
PaginatedResponse<{
  id: string
  code: string
  name: string
  categoryId: string
  category: { id: string; name: string }
  unit: string
  buyPrice: number
  sellPrice: number
  stock: number
  reservedStock: number
  minStock: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}>
```

#### GET /api/products/:id
Detail produk.

**Response:**
```typescript
ApiResponse<{
  id: string
  code: string
  name: string
  categoryId: string
  category: { id: string; name: string }
  unit: string
  buyPrice: number
  sellPrice: number
  stock: number
  reservedStock: number
  minStock: number
  isActive: boolean
  _count: { stockMovements: number }
  createdAt: string
  updatedAt: string
}>
```

#### POST /api/products
Buat produk baru.

**Request Body:**
```json
{
  "code": "PRD001",
  "name": "Beras 5kg",
  "categoryId": "clxx...",
  "unit": "pcs",
  "buyPrice": 50000,
  "sellPrice": 55000,
  "minStock": 10,
  "isActive": true
}
```

**Response:** `ApiResponse<Product>` (201)

#### PUT /api/products/:id
Update produk.

**Request Body:** (semua field optional)
```json
{
  "name": "Beras 10kg",
  "sellPrice": 110000
}
```

#### DELETE /api/products/:id
Soft delete (set isActive = false).

---

### 3.4 Product Vendor Prices

#### GET /api/products/:id/vendor-prices
List harga beli per vendor untuk produk tertentu.

**Response:**
```typescript
ApiResponse<{
  id: string
  productId: string
  vendorId: string
  vendor: { id: string; name: string }
  buyPrice: number
  isPreferred: boolean
  lastOrderAt: string | null
  notes: string | null
}[]>
```

#### POST /api/products/:id/vendor-prices
Tambah/update harga vendor untuk produk.

**Request Body:**
```json
{
  "vendorId": "clxx...",
  "buyPrice": 48000,
  "isPreferred": true,
  "notes": "Harga grosir"
}
```

#### GET /api/products/:id/vendor-prices/:vendorId
Detail harga vendor spesifik.

#### PUT /api/products/:id/vendor-prices/:vendorId
Update harga vendor.

**Request Body:**
```json
{
  "buyPrice": 47000,
  "isPreferred": true
}
```

#### DELETE /api/products/:id/vendor-prices/:vendorId
Hapus relasi produk-vendor.

---

### 3.5 Vendors

#### GET /api/vendors
List vendor.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| search | string | Cari nama |
| isActive | boolean | Filter status |

**Response:**
```typescript
ApiResponse<{
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}[]>
```

#### POST /api/vendors
Buat vendor.

**Request Body:**
```json
{
  "name": "PT Supplier",
  "phone": "08123456789",
  "address": "Jl. Raya No. 1",
  "isActive": true
}
```

#### GET /api/vendors/:id
Detail vendor.

**Response:**
```typescript
ApiResponse<{
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
  _count: { purchases: number }
  createdAt: string
  updatedAt: string
}>
```

#### GET /api/vendors/:id/debts
Ringkasan hutang ke vendor.

**Response:**
```typescript
ApiResponse<{
  totalOutstanding: number
  activeDebtsCount: number
  debts: VendorDebt[]
}>
```

#### GET /api/vendors/:id/payments
Riwayat pembayaran ke vendor.

**Response:**
```typescript
ApiResponse<{
  id: string
  vendorId: string
  amount: number
  paymentDate: string
  source: "DIRECT" | "POS_OVERPAYMENT"
  paymentMethod: "CASH" | "TRANSFER"
  notes: string | null
  allocations: {
    id: string
    amount: number
    debt: { purchase: { code: string } }
  }[]
}[]>
```

#### GET /api/vendors/:id/deposit
Saldo deposit vendor.

**Response:**
```typescript
ApiResponse<{
  totalBalance: number
  deposits: Deposit[]
}>
```

#### GET /api/vendors/:id/ledger
Buku besar vendor (ledger).

**Response:**
```typescript
ApiResponse<{
  entries: {
    id: string
    type: "INVOICE" | "PAYMENT_IN" | "PAYMENT_OUT" | "DEPOSIT_IN" | "DEPOSIT_OUT" | "DEPOSIT_RETURN" | "ADJUSTMENT"
    direction: "DEBIT" | "CREDIT"
    amount: number
    runningBalance: number
    description: string
    paymentMethod: "CASH" | "TRANSFER" | null
    referenceType: string | null
    referenceId: string | null
    notes: string | null
    createdAt: string
    createdBy: string
  }[]
}>
```

#### POST /api/vendors/:id/ledger
Recalculate running balance (fix data lama).


---

### 3.6 Customers

#### GET /api/customers
List customer dengan pagination.

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Halaman |
| limit | number | 20 | Per halaman |
| search | string | - | Cari nama |
| isActive | boolean | - | Filter status |

**Response:**
```typescript
PaginatedResponse<{
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}>
```

#### POST /api/customers
Buat customer.

**Request Body:**
```json
{
  "name": "Budi",
  "phone": "08123456789",
  "address": "Jl. Merdeka No. 5",
  "isActive": true
}
```

#### GET /api/customers/:id
Detail customer.

#### PUT /api/customers/:id
Update customer.

**Request Body:** (semua optional)
```json
{
  "name": "Budi Santoso",
  "phone": "08199999999"
}
```

#### DELETE /api/customers/:id
Soft delete (set isActive = false).

#### GET /api/customers/:id/debts
Ringkasan hutang customer.

**Response:**
```typescript
ApiResponse<{
  totalOutstanding: number
  debtCount: number
  debts: {
    id: string
    originalAmount: number
    paidAmount: number
    remainingAmount: number
    status: "UNPAID" | "PARTIAL" | "PAID"
    debtDate: string
    transaction: { code: string }
  }[]
}>
```

#### GET /api/customers/:id/payments
Riwayat pembayaran hutang customer.

**Response:**
```typescript
ApiResponse<{
  id: string
  customerId: string
  amount: number
  paymentDate: string
  source: "DIRECT" | "POS_OVERPAYMENT"
  notes: string | null
  allocations: {
    id: string
    amount: number
    debtId: string
    debt: { transaction: { code: string } }
  }[]
}[]>
```

#### GET /api/customers/:id/deposit
Saldo deposit customer.

**Response:**
```typescript
ApiResponse<{
  totalBalance: number
  deposits: {
    id: string
    amount: number
    usedAmount: number
    returnedAmount: number
    balance: number
    source: "OVERPAY_TRANSACTION" | "OVERPAY_PURCHASE" | "MANUAL"
    createdAt: string
  }[]
}>
```

#### GET /api/customers/:id/ledger
Buku hutang customer (riwayat hutang + pembayaran dengan running balance).

**Response:**
```typescript
ApiResponse<{
  entries: {
    id: string
    type: string
    direction: "DEBIT" | "CREDIT"
    amount: number
    runningBalance: number
    description: string
    referenceType: string | null
    referenceId: string | null
    createdAt: string
  }[]
  currentBalance: number
}>
```

---

### 3.7 Purchases (Pembelian Barang Masuk)

#### GET /api/purchases
List pembelian dengan pagination.

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Halaman |
| limit | number | 20 | Per halaman |
| vendorId | string | - | Filter vendor |
| dateFrom | string | - | Dari tanggal (ISO) |
| dateTo | string | - | Sampai tanggal (ISO) |

**Response:**
```typescript
PaginatedResponse<{
  id: string
  code: string
  vendorId: string
  vendor: { id: string; name: string }
  userId: string
  user: { name: string }
  totalAmount: number
  paidAmount: number
  debtAmount: number
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID"
  paymentMethod: "CASH" | "TRANSFER"
  notes: string | null
  purchaseDate: string
  createdAt: string
  items: PurchaseItem[]
}>
```

#### GET /api/purchases/:id
Detail pembelian.

**Response:**
```typescript
ApiResponse<{
  id: string
  code: string
  vendor: { id: string; name: string; phone: string | null }
  user: { name: string }
  totalAmount: number
  paidAmount: number
  changeAmount: number
  debtAmount: number
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID"
  paymentMethod: "CASH" | "TRANSFER"
  notes: string | null
  purchaseDate: string
  items: {
    id: string
    productId: string
    product: { id: string; name: string; code: string }
    quantity: number
    buyPrice: number
    previousBuyPrice: number | null
    priceChanged: boolean
    subtotal: number
  }[]
}>
```

#### POST /api/purchases
Buat pembelian baru.

**Request Body:**
```json
{
  "vendorId": "clxx...",
  "purchaseDate": "2026-05-23",
  "items": [
    { "productId": "clxx...", "quantity": 10, "buyPrice": 50000 }
  ],
  "notes": "Restock bulanan",
  "paidAmount": 500000,
  "paymentMethod": "TRANSFER",
  "confirmedPriceUpdates": ["productId1"]
}
```

**Response:** `ApiResponse<Purchase>` (201)

**Side Effects:**
- Stok bertambah (StockMovement PURCHASE_IN)
- Jika `paidAmount < totalAmount`: VendorDebt tercatat
- Jika `paidAmount > totalAmount`: Deposit vendor tercatat
- Harga beli produk diupdate jika berubah
- ProductVendorPrice diupdate

#### POST /api/purchases/detect-price-changes
Deteksi perubahan harga sebelum submit purchase.

**Request Body:**
```json
{
  "items": [
    { "productId": "clxx...", "buyPrice": 52000 }
  ]
}
```

**Response:**
```typescript
ApiResponse<{
  productId: string
  productName: string
  productCode: string
  previousBuyPrice: number
  newBuyPrice: number
  changed: boolean
}[]>
```

---

### 3.8 Stock Movements

#### GET /api/stock-movements
List pergerakan stok dengan pagination.

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Halaman |
| limit | number | 20 | Per halaman |
| productId | string | - | Filter produk |
| search | string | - | Cari nama produk |
| type | enum | - | PURCHASE_IN, SALE_OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT |
| dateFrom | string | - | Dari tanggal |
| dateTo | string | - | Sampai tanggal |

**Response:**
```typescript
PaginatedResponse<{
  id: string
  productId: string
  product: { id: string; name: string; code: string; unit: string; stock: number }
  type: "PURCHASE_IN" | "SALE_OUT" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT"
  quantity: number
  stockBefore: number
  stockAfter: number
  referenceCode: string | null
  notes: string | null
  createdAt: string
}>
```

#### POST /api/stock-movements/adjust
Penyesuaian stok manual.

**Request Body:**
```json
{
  "productId": "clxx...",
  "type": "ADJUSTMENT_IN",
  "quantity": 5,
  "notes": "Koreksi stok setelah stock opname"
}
```

**Response:** `ApiResponse<StockMovement>` (201)


---

### 3.9 Transactions (POS / Penjualan)

#### GET /api/transactions
List transaksi dengan pagination.

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Halaman |
| limit | number | 20 | Per halaman |
| customerId | string | - | Filter customer |
| paymentStatus | enum | - | PAID, PARTIAL, UNPAID |
| confirmationStatus | enum | - | DRAFT, CONFIRMED, CANCELLED |
| dateFrom | string | - | Dari tanggal |
| dateTo | string | - | Sampai tanggal |

**Response:**
```typescript
PaginatedResponse<{
  id: string
  code: string
  customerId: string | null
  customer: { id: string; name: string } | null
  userId: string
  user: { name: string }
  subtotal: number
  discountAmount: number
  packingFee: number
  totalAmount: number
  paidAmount: number
  changeAmount: number
  debtAmount: number
  depositUsed: number
  depositCreated: number
  paymentMethod: "CASH" | "TRANSFER"
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID"
  confirmationStatus: "DRAFT" | "CONFIRMED" | "CANCELLED"
  confirmedAt: string | null
  confirmedBy: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  notes: string | null
  transactionDate: string
  items: TransactionItem[]
}>
```

#### GET /api/transactions/:id
Detail transaksi.

**Response:**
```typescript
ApiResponse<{
  id: string
  code: string
  customer: { id: string; name: string; phone: string | null } | null
  user: { name: string }
  subtotal: number
  discountAmount: number
  packingFee: number
  totalAmount: number
  paidAmount: number
  changeAmount: number
  debtAmount: number
  depositUsed: number
  depositCreated: number
  paymentMethod: "CASH" | "TRANSFER"
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID"
  confirmationStatus: "DRAFT" | "CONFIRMED" | "CANCELLED"
  confirmedAt: string | null
  notes: string | null
  transactionDate: string
  items: {
    id: string
    productId: string
    productName: string
    quantity: number
    sellPrice: number
    buyPrice: number
    discountAmount: number
    subtotal: number
  }[]
  debt: {
    id: string
    originalAmount: number
    paidAmount: number
    remainingAmount: number
    status: "UNPAID" | "PARTIAL" | "PAID"
  } | null
}>
```

#### POST /api/transactions
Buat draft transaksi (Step 1 POS).

**Request Body:**
```json
{
  "customerId": "clxx...",
  "items": [
    {
      "productId": "clxx...",
      "quantity": 2,
      "sellPrice": 55000,
      "discountAmount": 0
    }
  ],
  "discountAmount": 5000,
  "notes": "Pelanggan tetap"
}
```

**Response:** `ApiResponse<Transaction>` (201)

**Side Effects:**
- reservedStock bertambah untuk setiap item
- Status: DRAFT, paymentStatus: UNPAID

#### PATCH /api/transactions/:id
Update items draft (sebelum konfirmasi).

**Request Body:**
```json
{
  "items": [
    { "productId": "clxx...", "quantity": 3, "sellPrice": 55000, "discountAmount": 0 }
  ],
  "discountAmount": 0
}
```

**Constraints:** Hanya transaksi DRAFT yang bisa diupdate.

#### POST /api/transactions/:id/confirm
Konfirmasi draft dan proses pembayaran (Step 2 POS).

**Request Body:**
```json
{
  "paidAmount": 100000,
  "paymentMethod": "CASH",
  "packingFee": 2000,
  "overpayAction": "deposit",
  "depositUsed": 0,
  "depositId": null,
  "notes": null,
  "items": null,
  "discountAmount": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| paidAmount | number | ✅ | Jumlah yang dibayar (bisa 0 = hutang semua) |
| paymentMethod | enum | ✅ | "CASH" atau "TRANSFER" |
| packingFee | number | ❌ | Biaya packing (default 0) |
| overpayAction | enum | ❌ | "return" (kembalian) atau "deposit" (simpan deposit) |
| depositUsed | number | ❌ | Jumlah deposit yang dipakai |
| depositId | string | ❌ | ID deposit yang dipakai |
| items | array | ❌ | Update items saat konfirmasi |
| discountAmount | number | ❌ | Update diskon saat konfirmasi |

**Response:** `ApiResponse<Transaction>`

**Side Effects:**
- Stok dikurangi (SALE_OUT), reservedStock dilepas
- Status → CONFIRMED
- Jika paidAmount < totalAmount: Debt tercatat, paymentStatus = PARTIAL/UNPAID
- Jika paidAmount > totalAmount + overpayAction = "deposit": Deposit customer tercatat
- Jika customer punya hutang lama & overpay: alokasi FIFO otomatis
- Ledger entry tercatat

#### POST /api/transactions/:id/cancel
Batalkan draft transaksi.

**Response:** `ApiResponse<Transaction>`

**Side Effects:**
- reservedStock dikembalikan
- Status → CANCELLED

---

### 3.10 Debts (Hutang Customer / Piutang)

#### GET /api/debts
List hutang customer dengan pagination.

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Halaman |
| limit | number | 20 | Per halaman |
| customerId | string | - | Filter customer |
| status | enum | UNPAID,PARTIAL | UNPAID, PARTIAL, PAID |

**Response:**
```typescript
PaginatedResponse<{
  id: string
  customerId: string
  customer: { id: string; name: string; phone: string | null }
  transactionId: string
  transaction: { id: string; code: string }
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  status: "UNPAID" | "PARTIAL" | "PAID"
  debtDate: string
  aging: {
    categoryName: string
    color: string
    days: number
  }
}>
```

#### GET /api/debts/:id
Detail hutang beserta riwayat pembayaran.

**Response:**
```typescript
ApiResponse<{
  id: string
  customerId: string
  customer: { id: string; name: string; phone: string | null }
  transaction: Transaction
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  status: "UNPAID" | "PARTIAL" | "PAID"
  debtDate: string
  settledAt: string | null
  payments: {
    id: string
    amount: number
    paymentDate: string
    source: "DIRECT" | "POS_OVERPAYMENT"
    notes: string | null
  }[]
}>
```

#### GET /api/debts/summary
Ringkasan hutang per customer (grouped).

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Halaman |
| limit | number | 20 | Per halaman |
| search | string | - | Cari nama customer |

**Response:**
```typescript
PaginatedResponse<{
  customerId: string
  name: string
  phone: string | null
  totalRemaining: number
  debtCount: number
}>
```

#### POST /api/debts/pay
Bayar hutang customer (alokasi FIFO).

**Request Body:**
```json
{
  "customerId": "clxx...",
  "amount": 100000,
  "notes": "Bayar sebagian"
}
```

**Response:**
```typescript
ApiResponse<{
  allocations: {
    debtId: string
    debtCode: string
    debtDate: string
    originalAmount: number
    currentRemaining: number
    allocatedAmount: number
    willBeFullyPaid: boolean
    remainingAfter: number
  }[]
  totalAllocated: number
  remainingChange: number
  customerPaymentId: string
}>
```

**Side Effects:**
- Hutang terlama dilunasi duluan (FIFO)
- Jika amount > total outstanding: sisa jadi Deposit
- Ledger entry PAYMENT_IN tercatat

#### POST /api/debts/preview
Preview alokasi FIFO sebelum bayar (tanpa eksekusi).

**Request Body:**
```json
{
  "customerId": "clxx...",
  "amount": 100000
}
```

**Response:**
```typescript
ApiResponse<{
  allocations: {
    debtId: string
    debtCode: string
    debtDate: string
    originalAmount: number
    currentRemaining: number
    allocatedAmount: number
    willBeFullyPaid: boolean
    remainingAfter: number
  }[]
  totalAllocated: number
  remainingChange: number
}>
```


---

### 3.11 Vendor Debts (Hutang ke Vendor)

#### GET /api/vendor-debts
List hutang ke vendor dengan pagination.

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Halaman |
| limit | number | 20 | Per halaman |
| vendorId | string | - | Filter vendor |
| status | enum | UNPAID,PARTIAL | Filter status |

**Response:**
```typescript
PaginatedResponse<{
  id: string
  vendorId: string
  vendor: { id: string; name: string; phone: string | null }
  purchaseId: string
  purchase: { code: string }
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  status: "UNPAID" | "PARTIAL" | "PAID"
  debtDate: string
}>
```

#### GET /api/vendor-debts/summary
Ringkasan hutang semua vendor (untuk halaman utama vendor debts).

**Response:**
```typescript
ApiResponse<{
  vendors: {
    vendor: { id: string; name: string; phone: string | null; address: string | null }
    totalOutstanding: number
    activeDebtsCount: number
    oldestDays: number
    depositBalance: number
    hasDebt: boolean
    hasDeposit: boolean
  }[]
  grandTotal: number
  vendorCount: number
}>
```

#### POST /api/vendor-debts/pay
Bayar hutang ke vendor.

**Request Body:**
```json
{
  "vendorId": "clxx...",
  "amount": 500000,
  "paymentMethod": "TRANSFER",
  "mode": "fifo",
  "vendorDebtId": null,
  "notes": "Bayar hutang bulan lalu"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| vendorId | string | ✅ | ID vendor |
| amount | number | ✅ | Jumlah bayar |
| paymentMethod | enum | ✅ | "CASH" atau "TRANSFER" |
| mode | enum | ✅ | "fifo" (otomatis) atau "invoice" (pilih hutang) |
| vendorDebtId | string | ❌ | Wajib jika mode = "invoice" |
| notes | string | ❌ | Catatan |

**Response:** `ApiResponse<{ allocations, totalAllocated, ... }>` (201)

#### POST /api/vendor-debts/preview
Preview alokasi FIFO sebelum bayar.

**Request Body:**
```json
{
  "vendorId": "clxx...",
  "amount": 500000
}
```

---

### 3.12 Deposits

#### GET /api/deposits
List deposit.

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| partyType | enum | - | "CUSTOMER" atau "VENDOR" |
| partyId | string | - | ID customer/vendor |
| activeOnly | boolean | true | Hanya yang masih ada saldo |

**Response:**
```typescript
ApiResponse<{
  id: string
  partyType: "CUSTOMER" | "VENDOR"
  partyId: string
  amount: number
  usedAmount: number
  returnedAmount: number
  balance: number
  source: "OVERPAY_TRANSACTION" | "OVERPAY_PURCHASE" | "MANUAL"
  sourceId: string | null
  notes: string | null
  createdAt: string
  usages: {
    id: string
    amount: number
    usageType: "PAYMENT" | "RETURN"
    referenceId: string | null
    notes: string | null
    createdAt: string
  }[]
}[]>
```

#### POST /api/deposits/:id/use
Gunakan deposit untuk pembayaran.

**Request Body:**
```json
{
  "amount": 50000,
  "referenceType": "TRANSACTION",
  "referenceId": "clxx..."
}
```

#### POST /api/deposits/:id/return
Kembalikan deposit ke pemilik.

**Request Body:**
```json
{
  "amount": 50000,
  "paymentMethod": "CASH",
  "notes": "Pengembalian deposit"
}
```

---

### 3.13 Debt Aging Categories

#### GET /api/debt-aging-categories
List kategori aging hutang.

**Response:**
```typescript
ApiResponse<{
  id: string
  name: string
  minDays: number
  maxDays: number | null
  color: string
  order: number
  createdAt: string
  updatedAt: string
}[]>
```

#### POST /api/debt-aging-categories
Buat kategori aging.

**Request Body:**
```json
{
  "name": "Current",
  "minDays": 0,
  "maxDays": 30,
  "color": "#22c55e",
  "order": 1
}
```

#### PUT /api/debt-aging-categories/:id
Update kategori aging.

#### DELETE /api/debt-aging-categories/:id
Hapus kategori aging (minimal harus ada 1).

---

### 3.14 Dashboard

#### GET /api/dashboard
Data dashboard real-time.

**Response:**
```typescript
ApiResponse<{
  salesSummary: {
    todayRevenue: number        // Penjualan hari ini (accrual)
    todayTransactions: number   // Jumlah transaksi hari ini
    weekRevenue: number         // Penjualan minggu ini
    monthRevenue: number        // Penjualan bulan ini
    monthRevenueChange: number  // % perubahan vs bulan lalu
    todayCashCollected: number  // Kas masuk hari ini (cash basis)
    todayNewDebt: number        // Piutang baru hari ini
  }
  totalOutstandingDebt: number  // Total piutang customer
  vendorDebtSummary: {
    totalOutstanding: number
    vendorCount: number
    topVendors: {
      vendorId: string
      vendorName: string
      totalOutstanding: number
    }[]
  }
  lowStockProducts: {
    id: string
    name: string
    stock: number
    minStock: number
  }[]
  salesChart: {
    date: string          // "2026-05-23"
    revenue: number       // Accrual
    cashCollected: number // Cash basis
  }[]
  topProducts: {
    productId: string
    name: string
    totalQty: number
    totalRevenue: number
  }[]
  debtByAging: {
    categoryName: string
    color: string
    total: number
  }[]
}>
```

---

### 3.15 Reports

#### GET /api/reports/sales
Laporan penjualan.

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| dateFrom | string | - | Dari tanggal (ISO) |
| dateTo | string | - | Sampai tanggal (ISO) |
| groupBy | enum | "day" | "day", "week", "month" |

**Response:**
```typescript
ApiResponse<{
  data: {
    date: string
    totalRevenue: number      // Accrual
    transactionCount: number
    cashCollected: number     // Cash basis
    newDebt: number           // Piutang baru
  }[]
  totalRevenue: number
  totalTransactions: number
  comparisonRevenue: number   // Periode sebelumnya
  revenueChange: number       // % perubahan
  totalCashCollected: number
  totalNewDebt: number
  totalDebtPaymentsReceived: number
}>
```

#### GET /api/reports/products
Laporan produk terlaris.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| dateFrom | string | Dari tanggal |
| dateTo | string | Sampai tanggal |
| categoryId | string | Filter kategori |

**Response:**
```typescript
ApiResponse<{
  productId: string
  productCode: string
  productName: string
  categoryName: string
  totalQty: number
  totalRevenue: number
  totalProfit: number
}[]>
```

#### GET /api/reports/debts
Laporan hutang (aging breakdown).

**Response:**
```typescript
ApiResponse<{
  buckets: {
    categoryName: string
    color: string
    count: number
    totalOutstanding: number
  }[]
  totalOutstanding: number
  totalCustomersWithDebt: number
}>
```

#### GET /api/reports/profit
Laporan profit.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| dateFrom | string | Dari tanggal |
| dateTo | string | Sampai tanggal |

**Response:**
```typescript
ApiResponse<{
  totalRevenue: number       // Accrual
  totalHPP: number           // Harga Pokok Penjualan
  totalProfit: number        // Gross profit (accrual)
  profitMargin: number       // % margin (accrual)
  totalCashRevenue: number   // Cash basis revenue
  totalCashProfit: number    // Cash basis profit
  cashProfitMargin: number   // % margin (cash)
  totalNewDebt: number
  totalDebtPaymentsReceived: number
  data: {
    date: string
    revenue: number       // Accrual
    cashRevenue: number   // Cash basis
    hpp: number
    profit: number        // Accrual profit
    cashProfit: number    // Cash profit
  }[]
}>
```

---

### 3.16 Users

#### GET /api/users
List semua user.

**Response:**
```typescript
ApiResponse<{
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: string
  updatedAt: string
}[]>
```

#### POST /api/users
Buat user baru.

**Request Body:**
```json
{
  "name": "Kasir 1",
  "email": "kasir1@fjpshop.com",
  "password": "password123"
}
```

#### GET /api/users/:id
Detail user.

#### PUT /api/users/:id
Update user.

**Request Body:**
```json
{
  "name": "Kasir Utama",
  "email": "kasir@fjpshop.com"
}
```

#### DELETE /api/users/:id
Hapus user (tidak bisa hapus diri sendiri).

---

### 3.17 Settings

#### GET /api/settings
Ambil semua settings.

**Response:**
```typescript
ApiResponse<{
  id: string
  key: string
  value: string
  group: "STORE" | "POS" | "REPORT"
  label: string | null
}[]>
```

**Known Settings Keys:**
| Key | Group | Description |
|-----|-------|-------------|
| store_name | STORE | Nama toko |
| store_address | STORE | Alamat toko |
| store_phone | STORE | Telepon toko |
| pos_default_payment | POS | Default metode bayar |
| pos_show_stock | POS | Tampilkan stok di POS |

#### PUT /api/settings
Update settings (batch).

**Request Body:**
```json
[
  { "key": "store_name", "value": "FJP Shop" },
  { "key": "store_phone", "value": "08123456789" }
]
```

---

## 4. Enums Reference

```typescript
enum PaymentMethod {
  CASH = "CASH"
  TRANSFER = "TRANSFER"
}

enum PaymentStatus {
  PAID = "PAID"
  PARTIAL = "PARTIAL"
  UNPAID = "UNPAID"
}

enum ConfirmationStatus {
  DRAFT = "DRAFT"
  CONFIRMED = "CONFIRMED"
  CANCELLED = "CANCELLED"
}

enum DebtStatus {
  UNPAID = "UNPAID"
  PARTIAL = "PARTIAL"
  PAID = "PAID"
}

enum StockMovementType {
  PURCHASE_IN = "PURCHASE_IN"
  SALE_OUT = "SALE_OUT"
  ADJUSTMENT_IN = "ADJUSTMENT_IN"
  ADJUSTMENT_OUT = "ADJUSTMENT_OUT"
}

enum PartyType {
  CUSTOMER = "CUSTOMER"
  VENDOR = "VENDOR"
}

enum DepositSource {
  OVERPAY_TRANSACTION = "OVERPAY_TRANSACTION"
  OVERPAY_PURCHASE = "OVERPAY_PURCHASE"
  MANUAL = "MANUAL"
}

enum PaymentSource {
  DIRECT = "DIRECT"
  POS_OVERPAYMENT = "POS_OVERPAYMENT"
}

enum LedgerEntryType {
  INVOICE = "INVOICE"
  PAYMENT_IN = "PAYMENT_IN"
  PAYMENT_OUT = "PAYMENT_OUT"
  DEPOSIT_IN = "DEPOSIT_IN"
  DEPOSIT_OUT = "DEPOSIT_OUT"
  DEPOSIT_RETURN = "DEPOSIT_RETURN"
  ADJUSTMENT = "ADJUSTMENT"
}

enum EntryDirection {
  DEBIT = "DEBIT"
  CREDIT = "CREDIT"
}

enum SettingGroup {
  STORE = "STORE"
  POS = "POS"
  REPORT = "REPORT"
}
```

---

## 5. Data Models (ERD Summary)

```
User ──< Transaction
User ──< Purchase

Category ──< Product
Product ──< StockMovement
Product ──< TransactionItem
Product ──< PurchaseItem
Product ──< ProductVendorPrice

Vendor ──< Purchase
Vendor ──< VendorDebt
Vendor ──< VendorPayment
Vendor ──< ProductVendorPrice
Vendor ──< Deposit (partyType=VENDOR)

Customer ──< Transaction
Customer ──< Debt
Customer ──< CustomerPayment
Customer ──< Deposit (partyType=CUSTOMER)

Transaction ──< TransactionItem
Transaction ──< StockMovement
Transaction ──o Debt (1:1)

Purchase ──< PurchaseItem
Purchase ──< StockMovement
Purchase ──o VendorDebt (1:1)

Debt ──< DebtPayment
DebtPayment >── CustomerPayment

VendorDebt ──< VendorDebtPayment
VendorDebtPayment >── VendorPayment

Deposit ──< DepositUsage

LedgerAccount ──< LedgerEntry
```

---

## 6. Catatan Integrasi Mobile

1. **Auth:** Gunakan endpoint `/api/auth/sign-in/email` untuk login. Simpan token/cookie dari response untuk request berikutnya.
2. **CORS:** Pastikan server dikonfigurasi untuk menerima request dari origin mobile app.
3. **Semua endpoint** return JSON dengan format konsisten (`ApiResponse` / `PaginatedResponse`).
4. **Decimal fields** (harga, amount) dikembalikan sebagai `number` di JSON response.
5. **Date fields** dikembalikan sebagai ISO string.
6. **Pagination** menggunakan query params `page` dan `limit`.
7. **Error handling:** Selalu cek field `success` di response. Jika `false`, baca field `error` untuk pesan.
