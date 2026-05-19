# Sprint 5 — POS & Transaksi (Core)

**Durasi:** Minggu 5–6  
**Goal:** Modul kasir berfungsi penuh — dari pilih produk hingga checkout, termasuk FIFO debt allocation engine, receipt, dan riwayat transaksi.

**Prasyarat:** Sprint 1–4 selesai. Model `Transaction`, `TransactionItem`, `Debt`, `DebtPayment` sudah ada di schema.

---

## 5.1 — FIFO Debt Allocation Engine

Ini adalah business logic paling kritis. Harus diimplementasi dengan benar sebelum POS bisa berfungsi.

### Types
- [ ] Buat `src/features/debts/types/debt.types.ts`:
  ```ts
  interface DebtAllocation {
    debtId: string
    debtCode: string          // kode transaksi asal hutang
    debtDate: Date
    originalAmount: Decimal
    currentRemaining: Decimal
    allocatedAmount: Decimal
    willBeFullyPaid: boolean
    remainingAfter: Decimal
  }

  interface AllocationResult {
    allocations: DebtAllocation[]
    totalAllocated: Decimal
    remainingChange: Decimal  // sisa yang jadi kembalian (jika ada)
  }

  interface FifoPreview {
    allocations: DebtAllocation[]
    totalAllocated: Decimal
    remainingChange: Decimal
  }
  ```

### Service
- [ ] Buat `src/features/debts/services/debt.service.ts`:

  **`previewFifoAllocation(customerId, totalPayment)`** — hitung preview tanpa menyimpan ke DB:
  - Ambil hutang UNPAID/PARTIAL urut `debtDate asc` (FIFO)
  - Iterasi: alokasikan `min(remaining, debt.remainingAmount)` ke setiap hutang
  - Return `FifoPreview` — digunakan untuk tampilan UI sebelum konfirmasi

  **`allocatePaymentFifo(customerId, totalPayment, sourceTransactionId?, notes?, tx?)`** — simpan ke DB:
  - Ambil hutang UNPAID/PARTIAL urut `debtDate asc`
  - Iterasi alokasi
  - Dalam transaksi DB (gunakan `tx` yang diberikan atau buat baru):
    - Buat `DebtPayment` record per hutang yang terkena alokasi
    - Update `debt.paidAmount`, `debt.remainingAmount`, `debt.status`, `debt.settledAt`
  - Log `[DEBT]` info: customerId, totalPayment, jumlah hutang yang terkena, detail per alokasi
  - Return `AllocationResult`

  **`hasOutstandingDebt(customerId)`** — return boolean, cek apakah ada hutang UNPAID/PARTIAL

  **`getOutstandingDebts(customerId)`** — return list hutang outstanding urut debtDate asc

---

## 5.2 — Cart Store (Zustand)

- [ ] Buat `src/features/pos/types/pos.types.ts`:
  ```ts
  interface CartItem {
    productId: string
    productCode: string
    productName: string
    unit: string
    sellPrice: Decimal
    buyPrice: Decimal       // untuk kalkulasi profit
    quantity: number
    discountAmount: Decimal
    subtotal: Decimal       // (sellPrice - discountAmount) * quantity
  }

  interface CartState {
    items: CartItem[]
    customerId: string | null
    customerName: string | null
    customerHasDebt: boolean
    customerOutstandingDebt: Decimal
    discountAmount: Decimal   // diskon total (bukan per item)
    paymentMethod: 'CASH' | 'TRANSFER'
    paidAmount: Decimal
  }

  interface CheckoutPayload {
    customerId?: string
    items: { productId: string; quantity: number; sellPrice: number; discountAmount: number }[]
    paidAmount: number
    paymentMethod: 'CASH' | 'TRANSFER'
    discountAmount: number
  }
  ```

- [ ] Buat `src/features/pos/stores/cart.store.ts` — Zustand store:
  - **State:** `items`, `customerId`, `customerName`, `customerHasDebt`, `customerOutstandingDebt`, `discountAmount`, `paymentMethod`, `paidAmount`
  - **Actions:**
    - `addItem(product)` — jika produk sudah ada di cart, increment qty; jika belum, tambah item baru
    - `removeItem(productId)` — hapus item dari cart
    - `updateQty(productId, qty)` — update qty; jika qty <= 0, hapus item
    - `updateItemDiscount(productId, discount)` — update diskon per item
    - `setCustomer(customerId, customerName)` — set customer + fetch debt info
    - `clearCustomer()` — reset customer ke walk-in
    - `setDiscount(amount)` — set diskon total
    - `setPaymentMethod(method)`
    - `setPaidAmount(amount)`
    - `clearCart()` — reset semua state ke initial
  - **Computed (getters):**
    - `subtotal` — sum semua item subtotal
    - `totalAmount` — subtotal − discountAmount
    - `debtAmount` — max(0, totalAmount − paidAmount)
    - `overpayAmount` — max(0, paidAmount − totalAmount)
    - `changeAmount` — overpayAmount jika tidak ada hutang lama, 0 jika ada hutang lama
    - `isWalkIn` — customerId === null

---

## 5.3 — POS Checkout API

### Schema
- [ ] Buat `src/features/pos/schemas/pos.schema.ts`:
  - `checkoutItemSchema`:
    - `productId`: string cuid
    - `quantity`: number int, min 1
    - `sellPrice`: number, min 0
    - `discountAmount`: number, min 0, default 0
  - `checkoutSchema`:
    - `customerId`: string cuid optional (null = walk-in)
    - `items`: array `checkoutItemSchema`, min 1
    - `paidAmount`: number, min 0
    - `paymentMethod`: enum `CASH | TRANSFER`
    - `discountAmount`: number, min 0, default 0
    - `notes`: string optional
    - Refinement: jika `customerId` null dan `paidAmount < totalAmount` → error "Walk-in customer harus bayar lunas"

### Service
- [ ] Buat `src/features/pos/services/pos.service.ts`:

  **`processCheckout(payload, userId)`** — dalam satu `prisma.$transaction`:

  1. **Hitung amount:**
     - `subtotal = sum(item.quantity * item.sellPrice - item.discountAmount * item.quantity)`
     - `totalAmount = subtotal - payload.discountAmount`
     - `debtAmount = max(0, totalAmount - paidAmount)`
     - `overpayAmount = max(0, paidAmount - totalAmount)`

  2. **Validasi walk-in:**
     - Jika `!customerId && debtAmount > 0` → throw `ValidationError`
     - Log `[POS]` warn jika walk-in mencoba hutang

  3. **Tentukan `paymentStatus`:**
     - `paidAmount >= totalAmount` → `PAID`
     - `paidAmount > 0 && paidAmount < totalAmount` → `PARTIAL`
     - `paidAmount === 0` → `UNPAID`

  4. **Generate kode:** `TRX-YYYYMMDD-XXXX`

  5. **Buat `Transaction`** dengan semua field

  6. **Buat `TransactionItem[]`** — snapshot: `productName`, `sellPrice`, `buyPrice` dari product saat ini

  7. **Decrement stok per item:** panggil `createMovement(tx, { type: 'SALE_OUT', quantity: -item.quantity, referenceCode: transaction.code, transactionId: transaction.id })`

  8. **Jika `debtAmount > 0`:** buat `Debt` record:
     - `originalAmount = debtAmount`
     - `remainingAmount = debtAmount`
     - `status = paidAmount === 0 ? 'UNPAID' : 'PARTIAL'`

  9. **Jika `overpayAmount > 0` dan `customerId`:**
     - Cek `hasOutstandingDebt(customerId)`
     - Jika ada hutang lama → panggil `allocatePaymentFifo(customerId, overpayAmount, transaction.id, undefined, tx)`
     - `changeAmount = 0` (sudah dialokasikan ke hutang)
     - Jika tidak ada hutang lama → `changeAmount = overpayAmount`

  10. **Update `transaction.changeAmount`** sesuai hasil

  11. **Log `[POS]` info:** kode transaksi, customerId, totalAmount, paidAmount, debtAmount, changeAmount

  12. Return transaction lengkap dengan items

### API Routes
- [ ] Buat `src/app/api/transactions/route.ts`:
  - `GET` — list transaksi, filter: `customerId`, `paymentStatus`, `dateFrom`, `dateTo`, `page`, `limit`; include customer; order by transactionDate desc
  - `POST` — checkout, validasi body dengan `checkoutSchema`, panggil `processCheckout()`
- [ ] Buat `src/app/api/transactions/[id]/route.ts`:
  - `GET` — detail transaksi: include items (include product), customer, debt, stockMovements

---

## 5.4 — POS UI Components

- [ ] Buat `src/features/pos/components/CustomerSelect.tsx`:
  - Combobox: opsi "Walk-in (Tunai)" + search customer terdaftar
  - Saat customer dipilih: fetch debt info, tampilkan di bawah select:
    - Jika ada hutang → alert kuning: "Hutang outstanding: Rp X.XXX.XXX"
    - Jika tidak ada hutang → tidak tampil apa-apa
  - Tombol clear untuk kembali ke walk-in

- [ ] Buat `src/features/pos/components/ProductSearch.tsx`:
  - Input search dengan debounce 300ms
  - Fetch produk aktif yang match nama/kode
  - Tampilkan hasil sebagai dropdown list: nama, kode, harga jual, stok
  - Klik item → panggil `addItem()` di cart store
  - Jika stok = 0 → tampilkan disabled dengan label "Habis"
  - Clear input setelah item ditambahkan

- [ ] Buat `src/features/pos/components/CartItem.tsx`:
  - Tampilkan: nama produk, kode, harga satuan
  - Input qty (number input, min 1, max = stok produk)
  - Input diskon per item (Rupiah)
  - Subtotal baris (auto-hitung)
  - Tombol hapus (X)

- [ ] Buat `src/features/pos/components/CartSummary.tsx`:
  - Tampilkan: Subtotal, Diskon Total (input), Total Akhir
  - Input diskon total → update cart store
  - Semua nilai format Rupiah

- [ ] Buat `src/features/pos/components/DebtAllocationPreview.tsx`:
  - Props: `preview: FifoPreview`
  - Tabel: Hutang (kode transaksi asal), Tanggal, Sisa Hutang, Dialokasikan, Status Setelah
  - Baris dengan `willBeFullyPaid = true` → highlight hijau "LUNAS"
  - Baris partial → highlight kuning "Sisa Rp X"
  - Footer: total dialokasikan, sisa kembalian (jika ada)

- [ ] Buat `src/features/pos/components/PaymentModal.tsx`:
  - Trigger: tombol "Bayar" di POS page
  - Tampilkan ringkasan: Total, Customer
  - Input: nominal bayar (number input, format Rupiah)
  - Select: metode bayar (CASH / TRANSFER)
  - Auto-hitung real-time:
    - Jika `paidAmount >= total` → tampilkan "Kembalian: Rp X" (hijau)
    - Jika `paidAmount < total` → tampilkan "Hutang: Rp X" (merah) — hanya jika customer terdaftar
    - Jika walk-in dan `paidAmount < total` → tampilkan error "Walk-in harus bayar lunas"
  - Jika ada overpay dan customer punya hutang lama → fetch preview FIFO → tampilkan `DebtAllocationPreview`
  - Tombol "Konfirmasi Pembayaran" (disabled jika walk-in + kurang bayar)
  - Loading state saat submit

- [ ] Buat `src/features/pos/components/Receipt.tsx`:
  - Props: `transaction: TransactionDetail`
  - Tampilkan: nama toko (dari settings), tanggal, kode transaksi, customer (atau "Walk-in")
  - Tabel items: nama, qty, harga, subtotal
  - Footer: subtotal, diskon, total, bayar, kembalian/hutang
  - Tombol "Print" (window.print() dengan CSS print)
  - Tombol "Transaksi Baru" → clearCart() + tutup receipt

### Hooks
- [ ] Buat `src/features/pos/hooks/useCart.ts`:
  - Wrapper untuk cart store
  - `checkout()` — kirim ke `/api/transactions`, handle loading/error/success
  - `getDebtPreview(paidAmount)` — fetch preview FIFO dari `/api/debts/preview` (atau hitung client-side)

---

## 5.5 — POS Page

- [ ] Buat `src/app/(dashboard)/pos/page.tsx`:
  - Layout 2 kolom (responsive):
    - **Kolom kiri (lebar):** `ProductSearch` di atas + list `CartItem` di bawah (scrollable)
    - **Kolom kanan (sempit):** `CustomerSelect` + `CartSummary` + tombol "Bayar" (disabled jika cart kosong)
  - `PaymentModal` sebagai overlay (state `isOpen`)
  - `Receipt` ditampilkan setelah checkout berhasil (state `lastTransaction`)
  - Keyboard shortcut opsional: Enter untuk fokus ke ProductSearch

---

## 5.6 — Transaksi (Riwayat)

### Service
- [ ] Buat `src/features/transactions/services/transaction.service.ts`:
  - `getAll(filter)` — filter: customerId, paymentStatus, dateFrom, dateTo; include customer; pagination
  - `getById(id)` — include items, customer, debt (include payments), stockMovements

### UI Components
- [ ] Buat `src/features/transactions/components/TransactionTable.tsx`:
  - Kolom: Kode, Customer (atau "Walk-in"), Tanggal, Total, Bayar, Status (StatusBadge), Aksi (Detail)
  - Filter: date range, status bayar, customer (search)
  - Gunakan `DataTable` + `Pagination`

- [ ] Buat `src/features/transactions/components/TransactionDetail.tsx`:
  - Info header: kode, tanggal, customer, kasir
  - Tabel items: nama produk, qty, harga, diskon, subtotal
  - Summary: subtotal, diskon, total, bayar, kembalian/hutang
  - Jika ada hutang → tampilkan info debt: original, terbayar, sisa, status
  - Riwayat pembayaran hutang (jika ada `DebtPayment` records)

### Pages
- [ ] Buat `src/app/(dashboard)/transactions/page.tsx`:
  - `PageWrapper` dengan judul "Transaksi"
  - `TransactionTable` dengan filter lengkap
- [ ] Buat `src/app/(dashboard)/transactions/[id]/page.tsx`:
  - `TransactionDetail` full page
  - Tombol "Kembali"

---

## Checklist Akhir Sprint 5

- [ ] POS bisa tambah produk ke cart via search
- [ ] Qty dan diskon per item bisa diedit
- [ ] CustomerSelect bisa pilih walk-in atau customer terdaftar
- [ ] Jika customer punya hutang → info hutang tampil di POS
- [ ] Walk-in + kurang bayar → ditolak dengan pesan error jelas
- [ ] Customer terdaftar + kurang bayar → hutang terbentuk
- [ ] Overpay + customer punya hutang lama → FIFO preview tampil sebelum konfirmasi
- [ ] Setelah checkout: stok berkurang, `StockMovement` terbuat, `Debt` terbuat (jika ada)
- [ ] Receipt tampil setelah checkout berhasil
- [ ] Riwayat transaksi bisa difilter dan dilihat detailnya
- [ ] Log `[POS]` dan `[DEBT]` muncul di console
