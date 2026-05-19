# POS System — App Specification & Development Plan

**Version:** 1.0.0  
**Stack:** Next.js 16 · Better Auth · Prisma v7 · PostgreSQL · Tailwind CSS · shadcn/ui · Zod · Zustand · React Hook Form

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Folder Structure](#2-folder-structure)
3. [Database Schema](#3-database-schema)
4. [API Routes](#4-api-routes)
5. [Module Specifications](#5-module-specifications)
6. [Business Logic — Critical Flows](#6-business-logic--critical-flows)
7. [Logging Strategy](#7-logging-strategy)
8. [Environment & Configuration](#8-environment--configuration)
9. [Development Phases](#9-development-phases)

---

## 1. System Overview

### Scope
- Single store, single admin, web-based, online
- Auth: Better Auth, single admin user (full access)
- No void/cancellation (future feature)
- No multi-branch, no offline mode

### Core Business Rules
- Walk-in customers: cash only, no debt allowed
- Registered customers: can pay full, partial, or defer as debt
- Debt allocation: **FIFO** — oldest debt settled first
- Overpayment at POS: excess auto-allocated to oldest outstanding debt
- HPP = buy price (harga beli). Profit = sell price − buy price
- Stock: decremented on sale, incremented on purchase/restock
- Debt aging: calculated from debt creation date, categories configurable by admin
- Price update on purchase: system detects change, admin confirms manually

---

## 2. Folder Structure

```
pos-system/
│
├── src/
│   │
│   ├── app/                                  # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                    # Sidebar + Header layout
│   │   │   ├── page.tsx                      # Dashboard
│   │   │   ├── pos/
│   │   │   │   └── page.tsx
│   │   │   ├── products/
│   │   │   │   ├── page.tsx                  # Product list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx              # Product detail
│   │   │   ├── categories/
│   │   │   │   └── page.tsx
│   │   │   ├── vendors/
│   │   │   │   └── page.tsx
│   │   │   ├── purchases/
│   │   │   │   ├── page.tsx                  # Purchase list
│   │   │   │   └── new/
│   │   │   │       └── page.tsx              # New purchase form
│   │   │   ├── stock-movements/
│   │   │   │   └── page.tsx
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx              # Customer detail + debt history
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── debts/
│   │   │   │   ├── page.tsx                  # Global debt view
│   │   │   │   └── [customerId]/
│   │   │   │       └── page.tsx              # Per-customer debt
│   │   │   ├── reports/
│   │   │   │   └── page.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   └── users/
│   │   │       └── page.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...all]/
│   │   │   │       └── route.ts              # Better Auth handler (GET, POST)
│   │   │   ├── products/
│   │   │   │   ├── route.ts                  # GET (list+search), POST
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts              # GET, PUT, DELETE
│   │   │   ├── categories/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── vendors/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── purchases/
│   │   │   │   ├── route.ts                  # GET, POST
│   │   │   │   └── [id]/route.ts             # GET
│   │   │   ├── stock-movements/
│   │   │   │   └── route.ts                  # GET only (read-only log)
│   │   │   ├── customers/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       └── debts/route.ts        # GET customer debts
│   │   │   ├── transactions/
│   │   │   │   ├── route.ts                  # GET, POST
│   │   │   │   └── [id]/route.ts             # GET
│   │   │   ├── debts/
│   │   │   │   ├── route.ts                  # GET (global)
│   │   │   │   ├── [id]/route.ts             # GET single debt
│   │   │   │   └── pay/route.ts              # POST — manual debt payment
│   │   │   ├── debt-aging-categories/
│   │   │   │   ├── route.ts                  # GET, POST
│   │   │   │   └── [id]/route.ts             # PUT, DELETE
│   │   │   ├── reports/
│   │   │   │   ├── sales/route.ts
│   │   │   │   ├── products/route.ts
│   │   │   │   ├── debts/route.ts
│   │   │   │   └── profit/route.ts
│   │   │   ├── settings/
│   │   │   │   └── route.ts                  # GET, PUT
│   │   │   └── users/
│   │   │       ├── route.ts
│   │   │       └── [id]/route.ts
│   │   │
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── not-found.tsx
│   │
│   ├── features/                             # Feature modules (business logic units)
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   └── LoginForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts
│   │   │   ├── schemas/
│   │   │   │   └── auth.schema.ts
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   │
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── SalesCard.tsx
│   │   │   │   ├── DebtSummaryCard.tsx
│   │   │   │   ├── TopProductsTable.tsx
│   │   │   │   └── SalesChart.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useDashboard.ts
│   │   │   ├── services/
│   │   │   │   └── dashboard.service.ts
│   │   │   └── types/
│   │   │       └── dashboard.types.ts
│   │   │
│   │   ├── pos/
│   │   │   ├── components/
│   │   │   │   ├── ProductSearch.tsx         # Search + add to cart
│   │   │   │   ├── CartItem.tsx
│   │   │   │   ├── CartSummary.tsx           # Subtotal, discount, total
│   │   │   │   ├── PaymentModal.tsx          # Payment input + mode selection
│   │   │   │   ├── CustomerSelect.tsx        # Walk-in or registered
│   │   │   │   ├── DebtAllocationPreview.tsx # Shows FIFO preview
│   │   │   │   └── Receipt.tsx               # Print/display receipt
│   │   │   ├── hooks/
│   │   │   │   └── useCart.ts
│   │   │   ├── stores/
│   │   │   │   └── cart.store.ts             # Zustand cart state
│   │   │   ├── services/
│   │   │   │   └── pos.service.ts            # Transaction creation + debt allocation
│   │   │   ├── schemas/
│   │   │   │   └── pos.schema.ts
│   │   │   └── types/
│   │   │       └── pos.types.ts
│   │   │
│   │   ├── products/
│   │   │   ├── components/
│   │   │   │   ├── ProductTable.tsx
│   │   │   │   ├── ProductForm.tsx
│   │   │   │   └── StockBadge.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useProducts.ts
│   │   │   ├── services/
│   │   │   │   └── product.service.ts
│   │   │   ├── schemas/
│   │   │   │   └── product.schema.ts
│   │   │   └── types/
│   │   │       └── product.types.ts
│   │   │
│   │   ├── categories/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   │   └── category.service.ts
│   │   │   └── schemas/
│   │   │
│   │   ├── vendors/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   │   └── vendor.service.ts
│   │   │   └── schemas/
│   │   │
│   │   ├── purchases/
│   │   │   ├── components/
│   │   │   │   ├── PurchaseTable.tsx
│   │   │   │   ├── PurchaseForm.tsx          # Multi-item purchase input
│   │   │   │   └── PriceChangeAlert.tsx      # Alert jika harga berubah
│   │   │   ├── services/
│   │   │   │   └── purchase.service.ts       # Stock update + price detection
│   │   │   └── schemas/
│   │   │       └── purchase.schema.ts
│   │   │
│   │   ├── stock-movements/
│   │   │   ├── components/
│   │   │   │   └── StockMovementTable.tsx
│   │   │   └── services/
│   │   │       └── stock-movement.service.ts
│   │   │
│   │   ├── customers/
│   │   │   ├── components/
│   │   │   │   ├── CustomerTable.tsx
│   │   │   │   ├── CustomerForm.tsx
│   │   │   │   └── CustomerDebtSummary.tsx
│   │   │   ├── services/
│   │   │   │   └── customer.service.ts
│   │   │   └── schemas/
│   │   │       └── customer.schema.ts
│   │   │
│   │   ├── transactions/
│   │   │   ├── components/
│   │   │   │   ├── TransactionTable.tsx
│   │   │   │   └── TransactionDetail.tsx
│   │   │   └── services/
│   │   │       └── transaction.service.ts
│   │   │
│   │   ├── debts/
│   │   │   ├── components/
│   │   │   │   ├── DebtTable.tsx             # Global or per-customer
│   │   │   │   ├── DebtPaymentForm.tsx       # Manual payment input
│   │   │   │   ├── DebtAgingBadge.tsx        # Color-coded aging category
│   │   │   │   ├── AgingCategoryManager.tsx  # Admin config UI
│   │   │   │   └── FifoAllocationPreview.tsx # Preview FIFO before confirm
│   │   │   ├── services/
│   │   │   │   ├── debt.service.ts           # Core FIFO logic
│   │   │   │   └── debt-aging.service.ts     # Aging calculation
│   │   │   ├── schemas/
│   │   │   │   └── debt.schema.ts
│   │   │   └── types/
│   │   │       └── debt.types.ts
│   │   │
│   │   ├── reports/
│   │   │   ├── components/
│   │   │   │   ├── SalesReport.tsx
│   │   │   │   ├── ProductReport.tsx
│   │   │   │   ├── DebtReport.tsx
│   │   │   │   ├── ProfitReport.tsx
│   │   │   │   └── ReportFilters.tsx
│   │   │   ├── services/
│   │   │   │   └── report.service.ts
│   │   │   └── types/
│   │   │       └── report.types.ts
│   │   │
│   │   ├── settings/
│   │   │   ├── components/
│   │   │   │   ├── StoreSettings.tsx
│   │   │   │   ├── PosSettings.tsx
│   │   │   │   └── AgingSettings.tsx         # Debt aging config
│   │   │   └── services/
│   │   │       └── settings.service.ts
│   │   │
│   │   └── users/
│   │       ├── components/
│   │       │   ├── UserTable.tsx
│   │       │   └── UserForm.tsx
│   │       ├── services/
│   │       │   └── user.service.ts
│   │       └── schemas/
│   │           └── user.schema.ts
│   │
│   ├── components/                           # Shared UI components
│   │   ├── ui/                               # shadcn/ui (auto-generated)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Breadcrumb.tsx
│   │   │   └── PageWrapper.tsx
│   │   └── shared/
│   │       ├── DataTable.tsx                 # Reusable table with pagination
│   │       ├── ConfirmDialog.tsx
│   │       ├── SearchInput.tsx
│   │       ├── DateRangePicker.tsx
│   │       ├── StatusBadge.tsx
│   │       ├── CurrencyDisplay.tsx           # Format Rupiah
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       └── Pagination.tsx
│   │
│   ├── lib/
│   │   ├── prisma.ts                         # Prisma client singleton
│   │   ├── logger.ts                         # Pino logger instance
│   │   ├── auth.ts                           # Better Auth server instance
│   │   ├── auth-client.ts                    # Better Auth client helpers
│   │   ├── api-handler.ts                    # Route wrapper + error boundary
│   │   ├── api-response.ts                   # Standardized response helpers
│   │   ├── exceptions.ts                     # Custom error classes
│   │   └── utils.ts                          # General helpers (formatRupiah, etc.)
│   │
│   ├── hooks/                                # Shared React hooks
│   │   ├── useDebounce.ts
│   │   ├── usePagination.ts
│   │   └── useToast.ts
│   │
│   ├── stores/                               # Global Zustand stores
│   │   └── auth.store.ts
│   │
│   ├── types/
│   │   ├── api.types.ts                      # ApiResponse<T>, PaginatedResponse<T>
│   │   └── index.ts
│   │
│   ├── schemas/
│   │   └── common.schema.ts                  # Shared Zod schemas (pagination, etc.)
│   │
│   └── config/
│       ├── app.config.ts                     # App name, version, currency
│       ├── nav.config.ts                     # Sidebar navigation definition
│       └── logger.config.ts                  # Log level, transports
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                               # Seed default settings + aging categories
│   └── migrations/
│
├── proxy.ts                                  # Auth guard (protect dashboard routes, Next.js 16)
├── env.ts                                   # Type-safe env validation (Zod)
├── next.config.ts
├── tailwind.config.ts
├── components.json                           # shadcn config
└── package.json
```

---

## 3. Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// AUTH (Better Auth base schema)
// ─────────────────────────────────────────────

model User {
  id            String    @id
  name          String
  email         String
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  accounts      Account[]

  @@unique([email])
  @@map("user")
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([token])
  @@index([userId])
  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
  @@map("account")
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
  @@map("verification")
}

// Catatan integrasi POS:
// Jika Purchase/Transaction memakai foreign key ke User, tambahkan relation
// balik di model User sesuai kebutuhan Prisma saat model bisnis diaktifkan.

// ─────────────────────────────────────────────
// PRODUCT & CATEGORY
// ─────────────────────────────────────────────

model Category {
  id        String    @id @default(cuid())
  name      String    @unique
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  products  Product[]

  @@map("categories")
}

model Product {
  id             String   @id @default(cuid())
  code           String   @unique          // SKU / barcode
  name           String
  categoryId     String
  category       Category @relation(fields: [categoryId], references: [id])
  unit           String                    // pcs, kg, box, dll
  buyPrice       Decimal  @db.Decimal(15, 2) // HPP (harga beli terakhir)
  sellPrice      Decimal  @db.Decimal(15, 2)
  stock          Int      @default(0)
  minStock       Int      @default(0)      // batas minimum stok (alert)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  stockMovements   StockMovement[]
  transactionItems TransactionItem[]
  purchaseItems    PurchaseItem[]

  @@map("products")
}

// ─────────────────────────────────────────────
// VENDOR
// ─────────────────────────────────────────────

model Vendor {
  id        String    @id @default(cuid())
  name      String
  phone     String?
  address   String?
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  purchases Purchase[]

  @@map("vendors")
}

// ─────────────────────────────────────────────
// PURCHASE (BARANG MASUK)
// ─────────────────────────────────────────────

model Purchase {
  id           String     @id @default(cuid())
  code         String     @unique           // PO-YYYYMMDD-XXXX
  vendorId     String
  vendor       Vendor     @relation(fields: [vendorId], references: [id])
  userId       String
  user         User       @relation(fields: [userId], references: [id])
  totalAmount  Decimal    @db.Decimal(15, 2)
  notes        String?
  purchaseDate DateTime   @default(now())
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  items          PurchaseItem[]
  stockMovements StockMovement[]

  @@map("purchases")
}

model PurchaseItem {
  id          String   @id @default(cuid())
  purchaseId  String
  purchase    Purchase @relation(fields: [purchaseId], references: [id])
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  quantity    Int
  buyPrice    Decimal  @db.Decimal(15, 2)  // harga beli saat itu
  previousBuyPrice Decimal? @db.Decimal(15, 2) // harga beli sebelumnya (untuk deteksi perubahan)
  priceChanged Boolean @default(false)     // flag: harga berubah dari terakhir
  subtotal    Decimal  @db.Decimal(15, 2)
  createdAt   DateTime @default(now())

  @@map("purchase_items")
}

// ─────────────────────────────────────────────
// STOCK MOVEMENT
// ─────────────────────────────────────────────

model StockMovement {
  id            String            @id @default(cuid())
  productId     String
  product       Product           @relation(fields: [productId], references: [id])
  type          StockMovementType
  quantity      Int               // positif = masuk, negatif = keluar
  stockBefore   Int
  stockAfter    Int
  referenceCode String?           // kode transaksi atau kode pembelian
  notes         String?
  createdAt     DateTime          @default(now())

  purchaseId    String?
  purchase      Purchase?     @relation(fields: [purchaseId], references: [id])
  transactionId String?
  transaction   Transaction?  @relation(fields: [transactionId], references: [id])

  @@map("stock_movements")
}

enum StockMovementType {
  PURCHASE_IN     // barang masuk dari pembelian vendor
  SALE_OUT        // barang keluar karena transaksi penjualan
  ADJUSTMENT_IN   // penyesuaian manual masuk
  ADJUSTMENT_OUT  // penyesuaian manual keluar
}

// ─────────────────────────────────────────────
// CUSTOMER
// ─────────────────────────────────────────────

model Customer {
  id        String    @id @default(cuid())
  name      String
  phone     String?
  address   String?
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  transactions Transaction[]
  debts        Debt[]

  @@map("customers")
}

// ─────────────────────────────────────────────
// TRANSACTION (PENJUALAN)
// ─────────────────────────────────────────────

model Transaction {
  id             String        @id @default(cuid())
  code           String        @unique       // TRX-YYYYMMDD-XXXX
  customerId     String?                     // null = walk-in
  customer       Customer?     @relation(fields: [customerId], references: [id])
  userId         String
  user           User          @relation(fields: [userId], references: [id])

  subtotal       Decimal       @db.Decimal(15, 2) // sebelum diskon
  discountAmount Decimal       @db.Decimal(15, 2) @default(0)
  totalAmount    Decimal       @db.Decimal(15, 2) // setelah diskon
  paidAmount     Decimal       @db.Decimal(15, 2) // uang yang dibayar
  changeAmount   Decimal       @db.Decimal(15, 2) @default(0) // kembalian (jika overpay & tidak ada hutang)
  debtAmount     Decimal       @db.Decimal(15, 2) @default(0) // sisa yang jadi hutang

  paymentMethod  PaymentMethod
  paymentStatus  PaymentStatus

  notes          String?
  transactionDate DateTime     @default(now())
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  items          TransactionItem[]
  debt           Debt?
  stockMovements StockMovement[]

  @@map("transactions")
}

enum PaymentMethod {
  CASH
  TRANSFER
}

enum PaymentStatus {
  PAID     // lunas
  PARTIAL  // bayar sebagian, sisa jadi hutang
  UNPAID   // tidak bayar sama sekali, semua jadi hutang
}

model TransactionItem {
  id             String      @id @default(cuid())
  transactionId  String
  transaction    Transaction @relation(fields: [transactionId], references: [id])
  productId      String
  product        Product     @relation(fields: [productId], references: [id])
  productName    String      // snapshot nama produk saat transaksi
  quantity       Int
  sellPrice      Decimal     @db.Decimal(15, 2) // snapshot harga jual saat transaksi
  buyPrice       Decimal     @db.Decimal(15, 2) // snapshot HPP saat transaksi
  discountAmount Decimal     @db.Decimal(15, 2) @default(0)
  subtotal       Decimal     @db.Decimal(15, 2)
  createdAt      DateTime    @default(now())

  @@map("transaction_items")
}

// ─────────────────────────────────────────────
// DEBT (HUTANG)
// ─────────────────────────────────────────────

model Debt {
  id              String      @id @default(cuid())
  customerId      String
  customer        Customer    @relation(fields: [customerId], references: [id])
  transactionId   String      @unique
  transaction     Transaction @relation(fields: [transactionId], references: [id])

  originalAmount  Decimal     @db.Decimal(15, 2) // hutang awal
  paidAmount      Decimal     @db.Decimal(15, 2) @default(0) // total terbayar
  remainingAmount Decimal     @db.Decimal(15, 2) // sisa hutang

  status          DebtStatus  @default(UNPAID)
  debtDate        DateTime    @default(now()) // tanggal hutang terbentuk (basis aging)
  settledAt       DateTime?   // tanggal lunas

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  payments        DebtPayment[]

  @@map("debts")
}

enum DebtStatus {
  UNPAID   // belum ada pembayaran
  PARTIAL  // sudah bayar sebagian
  PAID     // lunas
}

model DebtPayment {
  id          String        @id @default(cuid())
  debtId      String
  debt        Debt          @relation(fields: [debtId], references: [id])

  amount      Decimal       @db.Decimal(15, 2) // jumlah yang dialokasikan ke hutang ini
  paymentDate DateTime      @default(now())

  source      PaymentSource
  notes       String?

  // Jika dari overpayment POS, simpan referensi transaksinya
  sourceTransactionId String?

  createdAt   DateTime      @default(now())

  @@map("debt_payments")
}

enum PaymentSource {
  DIRECT           // pembayaran hutang langsung (dari modul Hutang)
  POS_OVERPAYMENT  // kelebihan bayar dari transaksi POS
}

// ─────────────────────────────────────────────
// DEBT AGING CATEGORY (CONFIGURABLE)
// ─────────────────────────────────────────────

model DebtAgingCategory {
  id       String   @id @default(cuid())
  name     String   // "Lancar", "Perhatian", "Kritis", "Macet"
  minDays  Int      // 0
  maxDays  Int?     // null = tidak terbatas (misal: 90+)
  color    String   @default("#gray") // hex color untuk badge UI
  order    Int      // urutan tampil

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("debt_aging_categories")
}

// ─────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────

model Setting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  group     SettingGroup
  label     String?  // label tampil di UI
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("settings")
}

enum SettingGroup {
  STORE   // nama toko, alamat, no hp, logo
  POS     // default metode bayar, tampilkan stok di POS
  REPORT  // format laporan, default periode
}
```

---

## 4. API Routes

### Conventions
- Response format: `{ success: boolean, data?: T, error?: string, meta?: PaginationMeta }`
- Auth: Better Auth session via HTTP-only cookie
- Better Auth endpoints are handled by the catch-all route `/api/auth/[...all]`
- Error codes: standard HTTP (400 validation, 401 unauth, 404 not found, 409 conflict, 500 server)
- Pagination: `?page=1&limit=20`
- Filter params per endpoint

```
GET    /api/auth/[...all]        (Better Auth managed endpoints)
POST   /api/auth/[...all]        (Better Auth managed endpoints)

GET    /api/products              ?search, categoryId, isActive, page, limit
POST   /api/products
GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id          (soft delete: isActive = false)

GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

GET    /api/vendors               ?search, isActive
POST   /api/vendors
PUT    /api/vendors/:id
DELETE /api/vendors/:id

GET    /api/purchases             ?vendorId, dateFrom, dateTo, page, limit
POST   /api/purchases             (create + update stock + detect price change)
GET    /api/purchases/:id

GET    /api/stock-movements       ?productId, type, dateFrom, dateTo, page, limit

GET    /api/customers             ?search, isActive, page, limit
POST   /api/customers
GET    /api/customers/:id
PUT    /api/customers/:id
DELETE /api/customers/:id
GET    /api/customers/:id/debts   (debt summary per customer)

GET    /api/transactions          ?customerId, paymentStatus, dateFrom, dateTo, page, limit
POST   /api/transactions          (POS checkout — core endpoint)
GET    /api/transactions/:id

GET    /api/debts                 ?customerId, status, agingCategoryId, page, limit
GET    /api/debts/:id
POST   /api/debts/pay             (manual debt payment — FIFO allocation)

GET    /api/debt-aging-categories
POST   /api/debt-aging-categories
PUT    /api/debt-aging-categories/:id
DELETE /api/debt-aging-categories/:id

GET    /api/reports/sales         ?dateFrom, dateTo, groupBy (day|week|month)
GET    /api/reports/products      ?dateFrom, dateTo, categoryId
GET    /api/reports/debts         ?agingCategoryId, customerId
GET    /api/reports/profit        ?dateFrom, dateTo

GET    /api/settings
PUT    /api/settings

GET    /api/users                (optional admin view, backed by Better Auth User)
POST   /api/users                (optional admin create/invite flow)
GET    /api/users/:id            (optional admin view)
PUT    /api/users/:id            (optional profile/admin metadata only)
DELETE /api/users/:id            (optional deactivate/delete flow)
```

---

## 5. Module Specifications

### 5.1 Dashboard
**Data yang ditampilkan:**
- Total penjualan hari ini / minggu / bulan (dengan perbandingan periode sebelumnya)
- Jumlah transaksi hari ini
- Total piutang outstanding (semua customer)
- Produk dengan stok di bawah `minStock` (alert)
- Grafik penjualan 30 hari terakhir
- Tabel 5 produk terlaris bulan ini
- Ringkasan hutang per aging category

---

### 5.2 POS / Kasir

**Flow lengkap:**
```
1. Pilih customer (walk-in atau cari customer terdaftar)
2. Tambah produk ke keranjang (search by name/code)
3. Atur qty, diskon per item (opsional)
4. Diskon total (opsional)
5. Klik Bayar → Payment Modal muncul
6. Input nominal bayar + metode bayar
7. Sistem hitung:
   - Jika bayar >= total → transaksi PAID
   - Jika bayar < total → selisih jadi hutang (hanya jika customer terdaftar)
   - Jika bayar > total → sisa diperiksa:
       → Ada hutang lama? → Tampilkan FIFO preview → alokasi otomatis
       → Tidak ada hutang? → Jadi kembalian (change)
8. Konfirmasi → transaksi tersimpan → stok berkurang → hutang terbentuk (jika ada)
9. Tampilkan receipt
```

**Catatan penting:**
- Walk-in + `paidAmount < totalAmount` → sistem tolak, wajib lunas
- Saat customer dipilih dan ada hutang outstanding → tampilkan informasi hutang di sidebar POS
- `DebtAllocationPreview` ditampilkan sebelum konfirmasi jika ada alokasi ke hutang lama

---

### 5.3 Produk & Kategori
- CRUD produk dengan kategori
- Stok tidak bisa diedit manual langsung di form produk (hanya via purchase atau adjustment di stock movement)
- Alert jika `stock <= minStock`
- Soft delete (isActive = false)

---

### 5.4 Vendor & Pembelian (Barang Masuk)

**Flow pembelian:**
```
1. Pilih vendor
2. Input tanggal pembelian
3. Tambah item (produk + qty + harga beli)
4. Sistem cek: apakah harga beli berbeda dari `product.buyPrice`?
   → Jika berbeda: tampilkan `PriceChangeAlert` (harga lama vs baru)
   → Admin bisa confirm update harga atau biarkan harga jual tetap
5. Simpan → stok terupdate → stock movement tercatat
6. Jika admin konfirmasi update harga → `product.buyPrice` diperbarui
```

---

### 5.5 Stock Movement
- Read-only log
- Filter: produk, tipe, tanggal
- Setiap record menampilkan: produk, tipe, qty, stok sebelum, stok sesudah, referensi (kode transaksi/pembelian)

---

### 5.6 Customer
- CRUD customer
- Halaman detail customer: info + riwayat transaksi + ringkasan hutang
- Customer dengan hutang aktif tidak bisa di-nonaktifkan

---

### 5.7 Transaksi
- List semua transaksi (filter: tanggal, status, customer)
- Detail transaksi: item, payment, debt yang terbentuk (jika ada)
- Read-only (tidak ada void untuk sekarang)

---

### 5.8 Hutang & Pembayaran Hutang

**Tampilan global:** semua hutang outstanding dari semua customer + filter aging category

**Tampilan per customer:** daftar hutang + riwayat pembayaran

**Manual debt payment flow:**
```
1. Admin buka halaman hutang customer
2. Klik "Bayar Hutang" → input nominal
3. Sistem tampilkan FIFO preview:
   Hutang #1 (Rp 100.000, 25 hari) → akan LUNAS
   Hutang #2 (Rp 250.000, 10 hari) → sisa Rp 150.000
4. Admin konfirmasi
5. Sistem buat DebtPayment records per debt yang terkena alokasi
6. Update remainingAmount + status setiap debt
```

**Debt aging badge:**
- Hitung `daysDiff = today - debt.debtDate`
- Cocokkan dengan `DebtAgingCategory` yang aktif
- Tampilkan badge dengan warna sesuai config

---

### 5.9 Laporan

| Laporan | Filter | Data |
|---|---|---|
| Penjualan | Tanggal, groupBy | Total, jumlah transaksi, grafik |
| Produk | Tanggal, kategori | Terlaris, total qty, total revenue |
| Hutang | Aging, customer | Outstanding, per aging bucket |
| Profit | Tanggal | Revenue, HPP total, profit |

---

### 5.10 Setting

**Grup konfigurasi:**
- **Store:** Nama toko, alamat, no. HP, catatan struk
- **POS:** Metode bayar yang tersedia
- **Debt Aging:** CRUD kategori aging (nama, min hari, max hari, warna)

---

## 6. Business Logic — Critical Flows

### 6.1 FIFO Debt Allocation Algorithm

```typescript
// features/debts/services/debt.service.ts

async function allocatePaymentFifo(
  customerId: string,
  totalPayment: Decimal,
  sourceTransactionId?: string,
  notes?: string
): Promise<AllocationResult> {
  // 1. Ambil semua hutang unpaid/partial, urut dari terlama
  const debts = await prisma.debt.findMany({
    where: {
      customerId,
      status: { in: ['UNPAID', 'PARTIAL'] }
    },
    orderBy: { debtDate: 'asc' }  // FIFO: terlama dulu
  })

  let remaining = totalPayment
  const allocations: DebtAllocation[] = []

  // 2. Iterasi hutang dari terlama
  for (const debt of debts) {
    if (remaining.lte(0)) break

    const allocate = Decimal.min(remaining, debt.remainingAmount)

    allocations.push({
      debtId: debt.id,
      amount: allocate,
      willBePaid: allocate.eq(debt.remainingAmount)
    })

    remaining = remaining.minus(allocate)
  }

  // 3. Simpan dalam satu transaksi database
  await prisma.$transaction(async (tx) => {
    for (const alloc of allocations) {
      // Buat debt payment record
      await tx.debtPayment.create({
        data: {
          debtId: alloc.debtId,
          amount: alloc.amount,
          source: sourceTransactionId ? 'POS_OVERPAYMENT' : 'DIRECT',
          sourceTransactionId,
          notes
        }
      })

      // Update debt
      await tx.debt.update({
        where: { id: alloc.debtId },
        data: {
          paidAmount: { increment: alloc.amount },
          remainingAmount: { decrement: alloc.amount },
          status: alloc.willBePaid ? 'PAID' : 'PARTIAL',
          settledAt: alloc.willBePaid ? new Date() : null
        }
      })
    }
  })

  return { allocations, remainingChange: remaining }
}
```

---

### 6.2 POS Checkout Flow (Pseudo-code)

```typescript
async function processCheckout(payload: CheckoutPayload) {
  const { customerId, items, paidAmount, paymentMethod, discountAmount } = payload

  // Hitung total
  const subtotal = sum(items.map(i => i.qty * i.sellPrice))
  const totalAmount = subtotal - discountAmount
  const debtAmount = max(0, totalAmount - paidAmount)
  const overpayAmount = max(0, paidAmount - totalAmount)

  // Validasi walk-in tidak boleh hutang
  if (!customerId && debtAmount > 0) throw new ValidationError(...)

  await prisma.$transaction(async (tx) => {
    // 1. Buat transaksi
    const transaction = await tx.transaction.create({ ... })

    // 2. Buat transaction items (snapshot harga)
    await tx.transactionItem.createMany({ ... })

    // 3. Kurangi stok + buat stock movement per item
    for (const item of items) {
      await decrementStock(tx, item.productId, item.qty, transaction.id)
    }

    // 4. Jika ada hutang → buat debt record
    if (debtAmount > 0) {
      await tx.debt.create({
        data: {
          customerId,
          transactionId: transaction.id,
          originalAmount: debtAmount,
          remainingAmount: debtAmount,
          status: paidAmount === 0 ? 'UNPAID' : 'PARTIAL'
        }
      })
    }

    // 5. Jika overpay dan customer punya hutang lama → alokasi FIFO
    if (overpayAmount > 0 && customerId) {
      const hasOldDebt = await checkHasOutstandingDebt(customerId)
      if (hasOldDebt) {
        await allocatePaymentFifo(customerId, overpayAmount, transaction.id)
        // change = 0 (sudah dialokasikan ke hutang)
      }
      // Jika tidak ada hutang lama → overpay jadi kembalian (changeAmount)
    }
  })
}
```

---

## 7. Logging Strategy

### Library: `pino` + `pino-pretty` (dev)

```typescript
// config/logger.config.ts

export const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'
// Levels: 'debug' | 'info' | 'warn' | 'error'
// Production: 'info' atau 'warn'
// Development: 'debug'
```

```typescript
// lib/logger.ts

import pino from 'pino'
import { LOG_LEVEL } from '@/config/logger.config'

const logger = pino({
  level: LOG_LEVEL,
  base: { service: 'pos-system' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}
  )
})

export const log = {
  debug: (context: string, msg: string, data?: object) =>
    logger.debug({ context, ...data }, msg),

  info: (context: string, msg: string, data?: object) =>
    logger.info({ context, ...data }, msg),

  warn: (context: string, msg: string, data?: object) =>
    logger.warn({ context, ...data }, msg),

  error: (context: string, msg: string, error?: unknown, data?: object) =>
    logger.error({ context, error, ...data }, msg),
}
```

### Log Contexts & Contoh Penggunaan

```
[AUTH]        → Better Auth login attempt, logout, session validation
[API]         → setiap request masuk (method, path, duration, status)
[POS]         → checkout berhasil, walk-in debt attempt rejected
[DEBT]        → FIFO allocation (detail per hutang yang dialokasikan)
[PURCHASE]    → barang masuk, price change detected
[STOCK]       → setiap pergerakan stok
[PRISMA]      → slow query (> 500ms)
[SETTING]     → perubahan konfigurasi
```

```typescript
// Contoh penggunaan di service

log.info('[DEBT]', 'FIFO allocation started', {
  customerId,
  totalPayment: totalPayment.toString(),
  debtsCount: debts.length
})

log.info('[DEBT]', 'Allocated to debt', {
  debtId: alloc.debtId,
  amount: alloc.amount.toString(),
  fullyPaid: alloc.willBePaid
})

log.warn('[POS]', 'Walk-in customer attempted debt payment', {
  totalAmount: totalAmount.toString(),
  paidAmount: paidAmount.toString()
})

log.error('[API]', 'Unhandled error in route', error, {
  path: req.url,
  method: req.method
})
```

### API Route Wrapper (Error Boundary)

```typescript
// lib/api-handler.ts

export function withHandler(handler: RouteHandler) {
  return async (req: Request, ctx: RouteContext) => {
    const start = Date.now()
    try {
      const res = await handler(req, ctx)
      log.info('[API]', `${req.method} ${req.url}`, {
        status: res.status,
        duration: Date.now() - start
      })
      return res
    } catch (error) {
      log.error('[API]', 'Route error', error, {
        path: req.url,
        method: req.method,
        duration: Date.now() - start
      })
      return handleApiError(error)
    }
  }
}
```

---

## 8. Environment & Configuration

```bash
# .env

DATABASE_URL="postgresql://user:password@localhost:5432/pos_db"
BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

NODE_ENV="development"           # development | production
LOG_LEVEL="debug"                # debug | info | warn | error

NEXT_PUBLIC_APP_NAME="Nama Toko"
NEXT_PUBLIC_APP_VERSION="1.0.0"
NEXT_PUBLIC_CURRENCY="IDR"
NEXT_PUBLIC_LOCALE="id-ID"
```

```typescript
// env.ts — type-safe validation dengan Zod

import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NEXT_PUBLIC_APP_NAME: z.string().default('POS System'),
  NEXT_PUBLIC_CURRENCY: z.string().default('IDR'),
  NEXT_PUBLIC_LOCALE: z.string().default('id-ID'),
})

export const env = envSchema.parse(process.env)
```

---

## 9. Development Phases

### Phase 1 — Foundation (Minggu 1–2)
- [ ] Setup project (Next.js, Prisma, Tailwind, shadcn)
- [ ] Prisma schema + migration + seed
- [ ] Auth (Better Auth server/client, `/api/auth/[...all]`, proxy guard)
- [ ] Layout: Sidebar, Header, PageWrapper
- [ ] Logger setup
- [ ] Shared components: DataTable, ConfirmDialog, StatusBadge

### Phase 2 — Master Data (Minggu 3)
- [ ] Kategori (CRUD)
- [ ] Produk (CRUD + stock display)
- [ ] Vendor (CRUD)
- [ ] Customer (CRUD)

### Phase 3 — Operasional Stok (Minggu 4)
- [ ] Pembelian barang (form multi-item + price change detection)
- [ ] Stock movement log
- [ ] Update stok otomatis saat pembelian

### Phase 4 — POS & Transaksi (Minggu 5–6)
- [ ] Cart store (Zustand)
- [ ] Product search, cart UI
- [ ] Payment modal (lunas / partial / hutang)
- [ ] FIFO debt allocation engine
- [ ] Checkout API endpoint (core business logic)
- [ ] Receipt display

### Phase 5 — Hutang (Minggu 7)
- [ ] Debt list (global + per customer)
- [ ] Manual debt payment + FIFO preview
- [ ] Debt aging calculation
- [ ] Aging category management (Setting)
- [ ] Aging badge di semua tampilan hutang

### Phase 6 — Laporan & Dashboard (Minggu 8)
- [ ] Dashboard cards + chart
- [ ] Laporan penjualan
- [ ] Laporan produk
- [ ] Laporan hutang + aging breakdown
- [ ] Laporan profit (harga jual − HPP)

### Phase 7 — Polish & Setting (Minggu 9)
- [ ] Setting toko, POS
- [ ] User management
- [ ] Low stock alerts
- [ ] Error handling & edge case review
- [ ] Log audit final

---

*Dokumen ini adalah living spec — update sesuai keputusan bisnis yang berkembang.*
```
