# Sprint 1 — Foundation & Infrastructure

**Durasi:** Minggu 1–2  
**Goal:** Project siap dibangun di atasnya — semua infrastruktur, auth, layout, dan shared utilities tersedia.

**Kondisi awal:**
- Next.js 16 + Prisma v7 + Better Auth sudah terpasang
- Schema Prisma: hanya tabel auth (user, session, account, verification) yang sudah ada + migration sudah jalan
- Schema bisnis belum ada di `schema.prisma`
- Layout masih default Next.js boilerplate
- Belum ada folder `src/features`, `src/lib`, `src/hooks`, `src/stores`, `src/config`

---

## 1.1 — Environment & Config

- [ ] Buat `env.ts` di root — validasi env dengan Zod: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NODE_ENV`, `LOG_LEVEL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_CURRENCY`, `NEXT_PUBLIC_LOCALE`
- [ ] Buat `src/config/app.config.ts` — export konstanta `APP_NAME`, `APP_VERSION`, `CURRENCY`, `LOCALE` dari env
- [ ] Buat `src/config/logger.config.ts` — export `LOG_LEVEL` dari env
- [ ] Buat `src/config/nav.config.ts` — definisi navigasi sidebar: label, href, icon (lucide-react) untuk semua menu (Dashboard, POS, Produk, Kategori, Vendor, Pembelian, Stock Movement, Customer, Transaksi, Hutang, Laporan, Settings, Users)

---

## 1.2 — Logger

- [ ] Install `pino` + `pino-pretty`
- [ ] Buat `src/lib/logger.ts` — instance pino dengan:
  - `level` dari `LOG_LEVEL`
  - `base: { service: 'pos-system' }`
  - `timestamp: pino.stdTimeFunctions.isoTime`
  - Transport `pino-pretty` hanya di `NODE_ENV === 'development'`
  - Export `log.debug(context, msg, data?)`, `log.info(context, msg, data?)`, `log.warn(context, msg, data?)`, `log.error(context, msg, error?, data?)`

---

## 1.3 — Prisma Schema & Migration

- [ ] Update `prisma/schema.prisma` — tambahkan semua model bisnis:
  - `Category` — id, name (unique), createdAt, updatedAt, products[]
  - `Product` — id, code (unique/SKU), name, categoryId, unit, buyPrice (Decimal 15,2), sellPrice (Decimal 15,2), stock (default 0), minStock (default 0), isActive (default true), createdAt, updatedAt, relasi ke stockMovements, transactionItems, purchaseItems
  - `Vendor` — id, name, phone?, address?, isActive, createdAt, updatedAt, purchases[]
  - `Purchase` — id, code (unique, PO-YYYYMMDD-XXXX), vendorId, userId, totalAmount, notes?, purchaseDate, createdAt, updatedAt, items[], stockMovements[]
  - `PurchaseItem` — id, purchaseId, productId, quantity, buyPrice, previousBuyPrice?, priceChanged (default false), subtotal, createdAt
  - `StockMovement` — id, productId, type (enum), quantity, stockBefore, stockAfter, referenceCode?, notes?, purchaseId?, transactionId?, createdAt
  - Enum `StockMovementType`: `PURCHASE_IN`, `SALE_OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`
  - `Customer` — id, name, phone?, address?, isActive, createdAt, updatedAt, transactions[], debts[]
  - `Transaction` — id, code (unique, TRX-YYYYMMDD-XXXX), customerId?, userId, subtotal, discountAmount (default 0), totalAmount, paidAmount, changeAmount (default 0), debtAmount (default 0), paymentMethod (enum), paymentStatus (enum), notes?, transactionDate, createdAt, updatedAt, items[], debt?, stockMovements[]
  - Enum `PaymentMethod`: `CASH`, `TRANSFER`
  - Enum `PaymentStatus`: `PAID`, `PARTIAL`, `UNPAID`
  - `TransactionItem` — id, transactionId, productId, productName (snapshot), quantity, sellPrice (snapshot), buyPrice (snapshot HPP), discountAmount (default 0), subtotal, createdAt
  - `Debt` — id, customerId, transactionId (unique), originalAmount, paidAmount (default 0), remainingAmount, status (enum, default UNPAID), debtDate, settledAt?, createdAt, updatedAt, payments[]
  - Enum `DebtStatus`: `UNPAID`, `PARTIAL`, `PAID`
  - `DebtPayment` — id, debtId, amount, paymentDate, source (enum), notes?, sourceTransactionId?, createdAt
  - Enum `PaymentSource`: `DIRECT`, `POS_OVERPAYMENT`
  - `DebtAgingCategory` — id, name, minDays, maxDays?, color (default "#gray"), order, createdAt, updatedAt
  - `Setting` — id, key (unique), value, group (enum), label?, createdAt, updatedAt
  - Enum `SettingGroup`: `STORE`, `POS`, `REPORT`
  - Tambahkan relasi balik `purchases[]` dan `transactions[]` di model `User`
- [ ] Jalankan `prisma migrate dev --name add_business_models`
- [ ] Generate Prisma client: `prisma generate`
- [ ] Buat `src/lib/prisma.ts` — singleton Prisma client dengan pattern `globalThis.__prisma` (hindari multiple instance di dev hot-reload)

---

## 1.4 — Seed

- [ ] Buat `prisma/seed.ts`:
  - Seed default `Setting` records:
    - Group `STORE`: `store_name` = "FJP Shop", `store_address` = "", `store_phone` = "", `store_receipt_note` = ""
    - Group `POS`: `pos_payment_methods` = "CASH,TRANSFER"
  - Seed 4 default `DebtAgingCategory`:
    - Lancar: minDays=0, maxDays=30, color="#22c55e", order=1
    - Perhatian: minDays=31, maxDays=60, color="#f59e0b", order=2
    - Kritis: minDays=61, maxDays=90, color="#ef4444", order=3
    - Macet: minDays=91, maxDays=null, color="#7f1d1d", order=4
- [ ] Tambahkan script `"seed": "tsx prisma/seed.ts"` di `package.json`
- [ ] Jalankan seed: `bun run seed`

---

## 1.5 — Auth (Better Auth)

- [ ] Buat `src/lib/auth.ts` — Better Auth server instance:
  - Plugin `emailAndPassword`
  - Database adapter Prisma (gunakan `prisma` singleton dari `src/lib/prisma.ts`)
  - `secret` dari `env.BETTER_AUTH_SECRET`
  - `baseURL` dari `env.BETTER_AUTH_URL`
- [ ] Buat `src/lib/auth-client.ts` — Better Auth client helpers:
  - Export `authClient` dengan `baseURL`
  - Export helper `signIn`, `signOut`, `useSession`
- [ ] Buat `src/app/api/auth/[...all]/route.ts` — handler GET + POST:
  ```ts
  import { auth } from "@/lib/auth"
  export const { GET, POST } = auth.handler
  ```
- [ ] Buat `proxy.ts` di root — middleware auth guard:
  - Protect semua route yang dimulai dengan `/(dashboard)` atau path dashboard
  - Redirect ke `/login` jika tidak ada session valid
  - Redirect ke `/` (dashboard) jika sudah login dan akses `/login`
  - Gunakan Better Auth `getSession` untuk validasi

---

## 1.6 — API Utilities

- [ ] Buat `src/types/api.types.ts`:
  ```ts
  interface ApiResponse<T> { success: boolean; data?: T; error?: string }
  interface PaginationMeta { page: number; limit: number; total: number; totalPages: number }
  interface PaginatedResponse<T> extends ApiResponse<T[]> { meta: PaginationMeta }
  ```
- [ ] Buat `src/types/index.ts` — re-export semua types
- [ ] Buat `src/schemas/common.schema.ts` — Zod schema:
  - `paginationSchema`: `page` (default 1), `limit` (default 20, max 100)
  - `idParamSchema`: `id` string cuid
  - `dateRangeSchema`: `dateFrom?`, `dateTo?`
- [ ] Buat `src/lib/exceptions.ts` — custom error classes yang extend `Error`:
  - `ValidationError` (400)
  - `UnauthorizedError` (401)
  - `NotFoundError` (404)
  - `ConflictError` (409)
  - Setiap class punya property `statusCode` dan `message`
- [ ] Buat `src/lib/api-response.ts` — helper functions:
  - `successResponse<T>(data: T, status = 200)` → `NextResponse`
  - `errorResponse(message: string, status = 500)` → `NextResponse`
  - `paginatedResponse<T>(data: T[], meta: PaginationMeta)` → `NextResponse`
  - `handleApiError(error: unknown)` → `NextResponse` (map custom errors ke status code yang tepat)
- [ ] Buat `src/lib/api-handler.ts` — `withHandler(handler)` wrapper:
  - Log request masuk: method, url, timestamp
  - Jalankan handler
  - Log response: status, duration
  - Catch semua error → panggil `handleApiError()`
  - Validasi session (opsional flag `requireAuth = true`)
- [ ] Buat `src/lib/utils.ts`:
  - `cn(...inputs)` — clsx + tailwind-merge
  - `formatRupiah(amount: number | Decimal)` — format ke "Rp 1.000.000"
  - `generateCode(prefix: string)` — generate kode unik: `${prefix}-${YYYYMMDD}-${4 digit random}`
  - `calculatePagination(page, limit, total)` → `PaginationMeta`

---

## 1.7 — Shared Hooks

- [ ] Buat `src/hooks/useDebounce.ts` — `useDebounce<T>(value: T, delay: number): T`
- [ ] Buat `src/hooks/usePagination.ts` — state `page`, `limit`, handler `setPage`, `setLimit`, `reset`
- [ ] Buat `src/hooks/useToast.ts` — wrapper Sonner: `toast.success()`, `toast.error()`, `toast.loading()`, `toast.dismiss()`

---

## 1.8 — Global Store

- [ ] Buat `src/stores/auth.store.ts` — Zustand store:
  - State: `user: User | null`, `isLoading: boolean`
  - Actions: `setUser()`, `clearUser()`, `setLoading()`

---

## 1.9 — Layout Components

- [ ] Buat `src/components/layout/Sidebar.tsx`:
  - Render navigasi dari `nav.config.ts`
  - Highlight active route dengan `usePathname()`
  - Tampilkan nama toko dari `app.config.ts`
  - Support collapse/expand (state lokal)
- [ ] Buat `src/components/layout/Header.tsx`:
  - Tampilkan judul halaman (dari props atau pathname)
  - User avatar + dropdown: nama user, tombol Logout (panggil `signOut`)
- [ ] Buat `src/components/layout/Breadcrumb.tsx`:
  - Generate breadcrumb otomatis dari `usePathname()`
  - Map segment ke label yang readable (misal: `products` → "Produk")
- [ ] Buat `src/components/layout/PageWrapper.tsx`:
  - Wrapper dengan padding konsisten
  - Slot untuk title, actions (tombol di kanan), dan children

---

## 1.10 — Shared UI Components

- [ ] Buat `src/components/shared/DataTable.tsx`:
  - Props: `columns[]` (header, accessor, render?), `data[]`, `isLoading`, `emptyMessage`
  - Gunakan shadcn `Table` sebagai base
  - Loading state dengan skeleton rows
- [ ] Buat `src/components/shared/ConfirmDialog.tsx`:
  - Props: `open`, `onConfirm`, `onCancel`, `title`, `description`, `confirmLabel`, `isLoading`
  - Gunakan shadcn `AlertDialog`
- [ ] Buat `src/components/shared/SearchInput.tsx`:
  - Props: `value`, `onChange`, `placeholder`, `debounceMs` (default 300)
  - Gunakan `useDebounce` internal
- [ ] Buat `src/components/shared/DateRangePicker.tsx`:
  - Props: `value: { from?: Date; to?: Date }`, `onChange`
  - Gunakan `react-day-picker` + shadcn `Popover`
- [ ] Buat `src/components/shared/StatusBadge.tsx`:
  - Props: `status: string`, `variant?: 'success' | 'warning' | 'danger' | 'default'`
  - Auto-map status umum (PAID→success, PARTIAL→warning, UNPAID→danger)
- [ ] Buat `src/components/shared/CurrencyDisplay.tsx`:
  - Props: `amount: number | Decimal`, `className?`
  - Render via `formatRupiah()`
- [ ] Buat `src/components/shared/LoadingSpinner.tsx` — spinner centered dengan ukuran konfigurabel
- [ ] Buat `src/components/shared/EmptyState.tsx`:
  - Props: `title`, `description?`, `action?` (label + onClick)
  - Gunakan shadcn `Empty` atau custom ilustrasi
- [ ] Buat `src/components/shared/Pagination.tsx`:
  - Props: `meta: PaginationMeta`, `onPageChange`
  - Tampilkan: "Menampilkan X–Y dari Z data" + tombol prev/next + nomor halaman

---

## 1.11 — Auth Feature & App Routes

- [ ] Buat `src/features/auth/types/auth.types.ts` — interface `LoginCredentials`, `AuthUser`
- [ ] Buat `src/features/auth/schemas/auth.schema.ts` — Zod schema `loginSchema`: email (valid email), password (min 8 char)
- [ ] Buat `src/features/auth/services/auth.service.ts` — `login()`, `logout()` menggunakan `authClient`
- [ ] Buat `src/features/auth/hooks/useAuth.ts` — hook: `login()`, `logout()`, `session`, `isLoading`
- [ ] Buat `src/features/auth/components/LoginForm.tsx`:
  - React Hook Form + Zod resolver
  - Field: email, password (dengan toggle show/hide)
  - Loading state saat submit
  - Error message dari API
  - Redirect ke dashboard setelah login berhasil
- [ ] Buat `src/app/(auth)/layout.tsx` — layout centered: background abu, card di tengah dengan logo toko
- [ ] Buat `src/app/(auth)/login/page.tsx` — render `<LoginForm />`
- [ ] Buat `src/app/(dashboard)/layout.tsx` — layout dengan `<Sidebar />` + `<Header />`, children di main content area
- [ ] Buat `src/app/(dashboard)/page.tsx` — placeholder: "Dashboard — Coming Soon" (akan diisi Sprint 7)
- [ ] Update `src/app/layout.tsx`:
  - Metadata: title dari `NEXT_PUBLIC_APP_NAME`
  - Tambahkan `<Toaster />` dari Sonner
- [ ] Buat `src/app/not-found.tsx` — halaman 404 dengan link kembali ke dashboard

---

## Checklist Akhir Sprint 1

- [ ] `bun run dev` berjalan tanpa error
- [ ] Akses `/login` → tampil form login
- [ ] Login dengan kredensial valid → redirect ke dashboard
- [ ] Akses route dashboard tanpa login → redirect ke `/login`
- [ ] Sidebar tampil dengan semua menu
- [ ] `bun run seed` berhasil mengisi data default
