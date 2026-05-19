# Sprint 9 — Schema & Migration: Sistem Keuangan Lanjutan

**Durasi:** Minggu 1–2  
**Goal:** Migrasi schema database untuk mendukung semua fitur keuangan lanjutan — multi-vendor per produk, hutang vendor, deposit dua arah, dan ledger terpusat.

**Prasyarat:** Sprint 1–8 selesai dan sudah di-deploy.

---

## 9.1 — Perubahan Schema

### Model Baru

**`ProductVendorPrice`** — catalog harga per vendor per produk
```prisma
model ProductVendorPrice {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  vendorId    String
  vendor      Vendor   @relation(fields: [vendorId], references: [id])
  buyPrice    Decimal  @db.Decimal(15, 2)
  isPreferred Boolean  @default(false)
  lastOrderAt DateTime?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([productId, vendorId])
  @@map("product_vendor_prices")
}
```

**`LedgerAccount`** — satu akun per customer/vendor
```prisma
model LedgerAccount {
  id        String    @id @default(cuid())
  partyType PartyType
  partyId   String
  createdAt DateTime  @default(now())
  entries   LedgerEntry[]

  @@unique([partyType, partyId])
  @@map("ledger_accounts")
}

enum PartyType { CUSTOMER VENDOR }
```

**`LedgerEntry`** — setiap event keuangan
```prisma
model LedgerEntry {
  id             String          @id @default(cuid())
  accountId      String
  account        LedgerAccount   @relation(fields: [accountId], references: [id])
  type           LedgerEntryType
  direction      EntryDirection
  amount         Decimal         @db.Decimal(15, 2)
  runningBalance Decimal         @db.Decimal(15, 2)
  description    String
  paymentMethod  PaymentMethod?
  referenceType  String?
  referenceId    String?
  notes          String?
  createdAt      DateTime        @default(now())
  createdBy      String

  @@index([accountId, createdAt])
  @@map("ledger_entries")
}

enum LedgerEntryType {
  INVOICE PAYMENT_IN PAYMENT_OUT
  DEPOSIT_IN DEPOSIT_OUT DEPOSIT_RETURN ADJUSTMENT
}

enum EntryDirection { DEBIT CREDIT }
```

**`Deposit`** — tracking deposit customer dan vendor
```prisma
model Deposit {
  id             String        @id @default(cuid())
  partyType      PartyType
  partyId        String
  amount         Decimal       @db.Decimal(15, 2)
  usedAmount     Decimal       @db.Decimal(15, 2) @default(0)
  returnedAmount Decimal       @db.Decimal(15, 2) @default(0)
  balance        Decimal       @db.Decimal(15, 2)
  source         DepositSource
  sourceId       String?
  createdAt      DateTime      @default(now())
  usages         DepositUsage[]

  @@map("deposits")
}

enum DepositSource {
  OVERPAY_TRANSACTION OVERPAY_PURCHASE MANUAL
}

model DepositUsage {
  id          String   @id @default(cuid())
  depositId   String
  deposit     Deposit  @relation(fields: [depositId], references: [id])
  amount      Decimal  @db.Decimal(15, 2)
  usageType   String   // "PAYMENT" | "RETURN"
  referenceId String?
  createdAt   DateTime @default(now())

  @@map("deposit_usages")
}
```

**`VendorDebt`** — hutang toko ke vendor (mirror Debt)
```prisma
model VendorDebt {
  id              String      @id @default(cuid())
  vendorId        String
  vendor          Vendor      @relation(fields: [vendorId], references: [id])
  purchaseId      String      @unique
  purchase        Purchase    @relation(fields: [purchaseId], references: [id])
  originalAmount  Decimal     @db.Decimal(15, 2)
  paidAmount      Decimal     @db.Decimal(15, 2) @default(0)
  remainingAmount Decimal     @db.Decimal(15, 2)
  status          DebtStatus  @default(UNPAID)
  debtDate        DateTime    @default(now())
  settledAt       DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  payments        VendorDebtPayment[]

  @@map("vendor_debts")
}

model VendorDebtPayment {
  id              String         @id @default(cuid())
  debtId          String
  debt            VendorDebt     @relation(fields: [debtId], references: [id])
  amount          Decimal        @db.Decimal(15, 2)
  paymentDate     DateTime       @default(now())
  source          PaymentSource
  notes           String?
  vendorPaymentId String?
  vendorPayment   VendorPayment? @relation(fields: [vendorPaymentId], references: [id])
  createdAt       DateTime       @default(now())

  @@map("vendor_debt_payments")
}

model VendorPayment {
  id            String              @id @default(cuid())
  vendorId      String
  vendor        Vendor              @relation(fields: [vendorId], references: [id])
  amount        Decimal             @db.Decimal(15, 2)
  paymentDate   DateTime            @default(now())
  source        PaymentSource
  paymentMethod PaymentMethod
  notes         String?
  createdAt     DateTime            @default(now())
  allocations   VendorDebtPayment[]

  @@map("vendor_payments")
}
```

### Perubahan Model Existing

**`Purchase`** — tambah field pembayaran:
```prisma
// Tambah ke model Purchase:
paidAmount    Decimal       @db.Decimal(15, 2) @default(0)
changeAmount  Decimal       @db.Decimal(15, 2) @default(0)
debtAmount    Decimal       @db.Decimal(15, 2) @default(0)
paymentStatus PaymentStatus @default(PAID)
paymentMethod PaymentMethod @default(CASH)
vendorDebt    VendorDebt?
```

**`Transaction`** — tambah field deposit:
```prisma
// Tambah ke model Transaction:
depositUsed   Decimal @db.Decimal(15, 2) @default(0)
depositCreated Decimal @db.Decimal(15, 2) @default(0)
```

**`Vendor`** — tambah relasi:
```prisma
vendorDebts    VendorDebt[]
vendorPayments VendorPayment[]
productPrices  ProductVendorPrice[]
```

**`Product`** — tambah relasi:
```prisma
vendorPrices ProductVendorPrice[]
```

**`Customer`** — tambah relasi:
```prisma
deposits Deposit[]
```

---

## 9.2 — Migration Strategy

- [ ] Buat migration `add_financial_system`
- [ ] Backfill `LedgerAccount` untuk semua customer dan vendor yang sudah ada
- [ ] Backfill `LedgerEntry` dari `Transaction` dan `Debt` yang sudah ada (untuk konsistensi laporan)
- [ ] Backfill `ProductVendorPrice` dari `PurchaseItem` yang sudah ada (ambil harga terakhir per produk-vendor)
- [ ] Update `Purchase` existing: set `paymentStatus=PAID`, `paidAmount=totalAmount`
- [ ] Jalankan `prisma generate`

---

## 9.3 — Service Layer Baru

- [ ] `src/features/ledger/services/ledger.service.ts`
  - `getOrCreateAccount(partyType, partyId)` — idempotent
  - `addEntry(accountId, type, direction, amount, meta)` — hitung runningBalance otomatis
  - `getAccountBalance(partyType, partyId)` — balance terkini
  - `getLedger(partyType, partyId, filters)` — semua entries dengan pagination

- [ ] `src/features/deposits/services/deposit.service.ts`
  - `getAvailableDeposit(partyType, partyId)` — total deposit yang bisa dipakai
  - `createDeposit(partyType, partyId, amount, source, sourceId)` 
  - `useDeposit(depositId, amount, referenceId)` — kurangi balance deposit
  - `returnDeposit(depositId, amount)` — kembalikan deposit ke cash

- [ ] `src/features/vendors/services/vendor-debt.service.ts`
  - `allocatePaymentFifo(vendorId, amount, paymentMethod, notes)` — FIFO
  - `allocatePaymentToInvoice(vendorDebtId, amount, paymentMethod, notes)` — per invoice
  - `previewFifoAllocation(vendorId, amount)` — preview tanpa simpan
  - `getVendorLedger(vendorId)` — buku besar vendor

---

## Checklist Akhir Sprint 9

- [ ] Semua model baru ter-migrate ke DB
- [ ] Backfill data existing berhasil
- [ ] `LedgerAccount` terbuat untuk semua customer dan vendor
- [ ] `ProductVendorPrice` terisi dari riwayat pembelian
- [ ] Build berhasil tanpa error TypeScript
- [ ] Seed diupdate untuk include data demo fitur baru
