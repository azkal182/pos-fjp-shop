# AI Design Prompt — POS FJP Shop Mobile App

## Context

Desain UI/UX untuk aplikasi mobile Point of Sale (POS) toko retail. Aplikasi digunakan oleh pemilik toko dan kasir untuk mengelola penjualan, pembelian, stok, hutang piutang, dan laporan. Target user: pemilik toko kecil-menengah di Indonesia.

## Design Direction

- **Style:** Modern, clean, minimalist dengan sentuhan profesional
- **Color scheme:** Neutral base (white/slate) dengan primary color biru atau indigo. Accent merah untuk hutang/warning, hijau untuk profit/success, kuning untuk alert
- **Typography:** Sans-serif, readable. Gunakan font weight untuk hierarchy (semibold untuk heading, regular untuk body)
- **Spacing:** Generous whitespace, card-based layout
- **Icons:** Outline style, consistent stroke width (Lucide/Phosphor style)
- **Platform:** Mobile-first (iOS & Android), safe area aware
- **Dark mode:** Opsional tapi siapkan color token yang support

## Design System Tokens

```
Colors:
  Primary: #4F46E5 (Indigo-600)
  Primary Light: #EEF2FF (Indigo-50)
  Success: #16A34A (Green-600)
  Warning: #D97706 (Amber-600)
  Danger: #DC2626 (Red-600)
  Background: #FFFFFF
  Surface: #F8FAFC (Slate-50)
  Border: #E2E8F0 (Slate-200)
  Text Primary: #0F172A (Slate-900)
  Text Secondary: #64748B (Slate-500)
  Text Muted: #94A3B8 (Slate-400)

Radius:
  Card: 16px
  Button: 12px
  Input: 10px
  Badge: 6px

Spacing:
  Page padding: 16px
  Card padding: 16px
  Section gap: 24px
  Item gap: 12px
```

---

## Halaman yang Perlu Didesain

### 1. Login

**Layout:**
- Logo toko di tengah atas (circular atau rounded square)
- Heading: "Masuk" dengan subtitle "Masukkan email dan password"
- Input email (with icon prefix)
- Input password (with show/hide toggle)
- Tombol "Masuk" full-width, primary color, rounded
- Subtle background gradient atau pattern

**State:** Loading (button spinner), Error (inline error message merah di bawah form)

---

### 2. Dashboard (Home)

**Layout:**
- Header: Greeting "Halo, {nama}" + avatar kecil di kanan
- **Summary Cards Row** (horizontal scroll atau 2-column grid):
  - Penjualan Hari Ini (angka besar + label)
  - Kas Masuk Hari Ini
  - Transaksi Hari Ini (count)
  - Piutang Baru
- **Sales Chart:** Line chart sederhana 7-30 hari terakhir, dual line (revenue vs cash collected). Compact, tinggi ~150px
- **Hutang Section:** 2 cards side-by-side:
  - Piutang Customer (total + aging color dots)
  - Hutang ke Vendor (total + jumlah vendor)
- **Produk Terlaris:** Horizontal list 5 item (rank number + nama + qty)
- **Stok Rendah Alert:** Card kuning dengan icon warning, list 3-5 produk, "Lihat Semua" link

**Bottom Navigation Bar:**
- 5 tabs: Dashboard (home icon), POS (shopping bag), Produk (box), Hutang (wallet), Menu (hamburger/more)

---

### 3. POS / Kasir (Halaman Utama Penjualan)

**Ini halaman paling penting — desain harus optimal untuk kecepatan kasir.**

**Layout:**
- **Top bar:** Search produk (large, prominent) + scan barcode icon button
- **Product Grid/List:** Tampilkan produk sebagai cards (gambar placeholder + nama + harga + stok). Bisa toggle grid (2 col) / list view. Tap untuk tambah ke cart.
- **Category Filter:** Horizontal scrollable chips di bawah search
- **Floating Cart Button:** Fixed bottom-right, circular, badge count item. Tap untuk buka cart sheet.

**Cart Sheet (Bottom Sheet):**
- Slide up dari bawah, 70% tinggi layar
- List items: nama produk, qty stepper (+/-), harga, subtotal per item, swipe-to-delete
- Diskon input (optional, collapsible)
- Customer select (optional, tap untuk buka picker)
- **Summary footer:** Subtotal, Diskon, Total (bold besar)
- Tombol "Simpan Draft" (outline) dan "Lanjut Bayar" (primary, prominent)

**Payment Modal (Full screen atau large bottom sheet):**
- Tampilkan total yang harus dibayar (angka besar)
- Input "Jumlah Bayar" (numeric keypad style atau input besar)
- Payment method toggle: CASH / TRANSFER (pill buttons)
- Biaya Packing input (optional, small)
- Jika customer punya deposit: tampilkan "Gunakan Deposit: Rp xxx" toggle
- Kalkulasi otomatis: Kembalian / Hutang
- Jika overpay: pilihan "Kembalikan" atau "Simpan sebagai Deposit"
- Tombol "Konfirmasi Pembayaran" (large, green/primary)

**Receipt Screen (setelah sukses):**
- Animasi checkmark sukses
- Info ringkas: kode transaksi, total, bayar, kembalian/hutang
- Tombol: "Cetak Struk", "Bagikan", "Transaksi Baru"

---

### 4. Daftar Produk

**Layout:**
- Search bar di atas
- Filter row: Category dropdown + Status (Aktif/Semua) + Sort
- Product list (card style):
  - Nama produk (bold)
  - Kode | Kategori | Satuan
  - Harga jual (prominent) | Harga beli (muted)
  - Stok badge (hijau jika aman, merah jika rendah)
- FAB "+" untuk tambah produk

**Detail/Edit Produk (separate screen):**
- Form fields: Kode, Nama, Kategori (dropdown), Satuan, Harga Beli, Harga Jual, Min Stok, Status toggle
- Section "Harga per Vendor" — list vendor + harga + preferred badge
- Tombol Save

---

### 5. Daftar Transaksi

**Layout:**
- Tab bar atas: "Semua" | "Pending (Draft)" | "Selesai" | "Batal"
- Filter: Date range picker + Customer
- Transaction cards:
  - Kode transaksi (bold) + tanggal (right-aligned, muted)
  - Customer name (atau "Walk-in")
  - Total amount (large)
  - Status badges: DRAFT (kuning), CONFIRMED (hijau), CANCELLED (merah)
  - Payment status: PAID (hijau), PARTIAL (orange), UNPAID (merah)
- Tap card → Detail transaksi

**Detail Transaksi:**
- Header: kode, tanggal, status badges
- Customer info
- Items table: produk, qty, harga, subtotal
- Summary: subtotal, diskon, packing, total, dibayar, kembalian/hutang
- Action buttons (conditional):
  - DRAFT: "Konfirmasi" + "Batalkan"
  - CONFIRMED: "Cetak Struk" + "Export PDF"

---

### 6. Pembelian (Purchase)

**Layout mirip Transaksi, tapi untuk barang masuk.**

- List: kode, vendor, tanggal, total, status bayar
- FAB "+" → Form pembelian baru

**Form Pembelian Baru:**
- Pilih Vendor (searchable dropdown)
- Tanggal pembelian (date picker)
- Items section:
  - Tombol "+ Tambah Item"
  - Per item: Produk (searchable), Qty, Harga Beli
  - Jika harga berubah: alert kuning "Harga berubah dari Rp X → Rp Y"
- Payment section: Total, Jumlah Bayar, Metode
- Tombol "Simpan Pembelian"

---

### 7. Hutang Customer (Piutang)

**Layout:**
- **Summary cards atas:**
  - Total Outstanding (merah, angka besar)
  - Customer Berpiutang (count)
  - Hutang Terlama (X hari)
- **Tab:** "Per Transaksi" | "Per Customer"
- **Per Transaksi list:**
  - Customer name + kode transaksi
  - Sisa hutang (bold merah)
  - Aging badge (warna sesuai kategori: hijau=current, kuning=30-60, merah=90+)
  - Tanggal hutang
- **Per Customer list:**
  - Customer name
  - Total hutang + jumlah invoice
  - Tap → Detail buku hutang customer

**Bayar Hutang (Bottom Sheet):**
- Pilih customer (jika dari tab global)
- Input nominal bayar
- Preview alokasi FIFO: list hutang yang akan terbayar (dari terlama)
- Tombol "Bayar"

---

### 8. Hutang ke Vendor

**Layout mirip Hutang Customer tapi perspektif terbalik (kita yang berhutang).**

- Summary: Total Hutang ke Vendor, Jumlah Vendor
- List vendor cards:
  - Nama vendor
  - Total hutang (bold)
  - Jumlah invoice aktif
  - Hutang terlama (X hari)
  - Saldo deposit (jika ada)
- Tap → Detail per vendor (list hutang + tombol bayar)

**Bayar Hutang Vendor (Bottom Sheet):**
- Mode: FIFO (otomatis) atau Pilih Invoice
- Input nominal
- Metode: CASH / TRANSFER
- Preview alokasi
- Tombol "Bayar"

---

### 9. Laporan

**Layout:**
- Tab/Segment: "Penjualan" | "Produk" | "Hutang" | "Profit"
- Date range picker (preset: Hari ini, 7 hari, 30 hari, Bulan ini, Custom)

**Tab Penjualan:**
- Summary cards: Total Revenue, Total Transaksi, Kas Masuk, % Perubahan
- Line chart (revenue + cash collected)
- Table breakdown per hari/minggu/bulan

**Tab Produk:**
- Ranked list: #1, #2, ... produk terlaris
- Per item: nama, qty terjual, revenue, profit
- Category filter

**Tab Hutang:**
- Aging breakdown (colored horizontal bar atau donut chart)
- Per bucket: nama kategori, jumlah customer, total outstanding

**Tab Profit:**
- Summary: Revenue, HPP, Gross Profit, Margin %
- Dual view: Accrual vs Cash basis
- Chart: profit trend

---

### 10. Menu / More (Tab ke-5)

**Layout:** Simple list menu dengan icon + label + chevron right.

Sections:
- **Master Data:** Kategori, Vendor, Customer, Stok Movement
- **Pengaturan:** Info Toko, Pengaturan POS, Aging Hutang
- **Akun:** Manajemen User, Profil, Logout

---

### 11. Customer / Vendor Detail (Template Reusable)

**Layout:**
- Header card: Nama (large), Phone, Address, Status badge
- Tab: "Info" | "Hutang" | "Riwayat Bayar" | "Deposit"
- Tab Hutang: list hutang aktif + tombol "Bayar"
- Tab Riwayat: timeline pembayaran
- Tab Deposit: saldo + riwayat penggunaan

---

### 12. Stok Movement

**Layout:**
- Filter: Produk search, Tipe (semua/masuk/keluar/adjustment), Date range
- List cards:
  - Produk name + code
  - Type badge (PURCHASE_IN=hijau, SALE_OUT=merah, ADJUSTMENT=biru)
  - Qty (+5 atau -3)
  - Stok before → after
  - Tanggal
- FAB "+" → Form Penyesuaian Stok (produk, tipe in/out, qty, alasan)

---

## Interaction & Animation Notes

- **Bottom sheets:** Smooth slide-up, drag-to-dismiss, backdrop blur
- **Page transitions:** Slide left/right untuk navigasi, fade untuk modal
- **Loading states:** Skeleton shimmer untuk cards, spinner untuk buttons
- **Pull-to-refresh:** Pada semua list pages
- **Haptic feedback:** Pada tap tombol penting (konfirmasi bayar, dll)
- **Toast notifications:** Slide-in dari atas, auto-dismiss 3 detik
- **Number inputs:** Gunakan numeric keyboard, auto-format ribuan (1.000.000)
- **Empty states:** Ilustrasi sederhana + teks + CTA button

## Deliverables

Buat mockup/wireframe untuk setiap halaman di atas dalam format yang bisa di-review. Prioritas:
1. POS/Kasir (paling kompleks)
2. Dashboard
3. Hutang Customer
4. Daftar Transaksi
5. Sisanya

Gunakan device frame iPhone 15 Pro (393 x 852 px) sebagai canvas utama.
