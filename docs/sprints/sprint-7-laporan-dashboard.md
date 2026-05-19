# Sprint 7 — Laporan & Dashboard

**Durasi:** Minggu 8  
**Goal:** Dashboard informatif dengan data real-time dan 4 laporan bisnis (penjualan, produk, hutang, profit) berfungsi penuh.

**Prasyarat:** Sprint 1–6 selesai. Data transaksi, hutang, dan produk sudah ada.

---

## 7.1 — Report Service & API

### Types
- [ ] Buat `src/features/reports/types/report.types.ts`:
  ```ts
  interface SalesDataPoint {
    date: string          // label: "2026-05-01" atau "Minggu 1" atau "Januari"
    totalRevenue: number
    transactionCount: number
  }

  interface SalesReport {
    data: SalesDataPoint[]
    totalRevenue: number
    totalTransactions: number
    comparisonRevenue: number   // periode sebelumnya untuk % perubahan
    revenueChange: number       // persentase naik/turun
  }

  interface ProductReportItem {
    productId: string
    productCode: string
    productName: string
    categoryName: string
    totalQty: number
    totalRevenue: number
    totalProfit: number
  }

  interface DebtReportBucket {
    categoryName: string
    color: string
    count: number
    totalOutstanding: number
  }

  interface DebtReport {
    buckets: DebtReportBucket[]
    totalOutstanding: number
    totalCustomersWithDebt: number
  }

  interface ProfitReport {
    totalRevenue: number
    totalHPP: number
    totalProfit: number
    profitMargin: number        // persentase
    data: { date: string; revenue: number; hpp: number; profit: number }[]
  }
  ```

### Service
- [ ] Buat `src/features/reports/services/report.service.ts`:

  **`getSalesReport(dateFrom, dateTo, groupBy: 'day'|'week'|'month')`**
  - Query `Transaction` dengan filter tanggal, status PAID/PARTIAL
  - Group by tanggal sesuai `groupBy`
  - Hitung total revenue dan jumlah transaksi per group
  - Hitung periode sebelumnya (sama panjang, sebelum dateFrom) untuk perbandingan
  - Return `SalesReport`

  **`getProductReport(dateFrom, dateTo, categoryId?)`**
  - Query `TransactionItem` join `Transaction` (filter tanggal)
  - Group by productId
  - Hitung: totalQty, totalRevenue (sellPrice * qty), totalProfit ((sellPrice - buyPrice) * qty)
  - Filter by categoryId jika ada
  - Order by totalRevenue desc
  - Return `ProductReportItem[]`

  **`getDebtReport(agingCategoryId?, customerId?)`**
  - Ambil semua hutang UNPAID/PARTIAL
  - Classify aging setiap hutang
  - Group by aging category → hitung count dan totalOutstanding per bucket
  - Filter by agingCategoryId atau customerId jika ada
  - Return `DebtReport`

  **`getProfitReport(dateFrom, dateTo)`**
  - Query `TransactionItem` join `Transaction` (filter tanggal, status PAID/PARTIAL)
  - Hitung: `revenue = sellPrice * qty`, `hpp = buyPrice * qty`, `profit = revenue - hpp`
  - Group by hari untuk grafik
  - Return `ProfitReport`

### API Routes
- [ ] Buat `src/app/api/reports/sales/route.ts`:
  - `GET` — query params: `dateFrom`, `dateTo`, `groupBy` (default: `day`)
- [ ] Buat `src/app/api/reports/products/route.ts`:
  - `GET` — query params: `dateFrom`, `dateTo`, `categoryId`
- [ ] Buat `src/app/api/reports/debts/route.ts`:
  - `GET` — query params: `agingCategoryId`, `customerId`
- [ ] Buat `src/app/api/reports/profit/route.ts`:
  - `GET` — query params: `dateFrom`, `dateTo`

---

## 7.2 — Dashboard Service

- [ ] Buat `src/features/dashboard/types/dashboard.types.ts`:
  ```ts
  interface DashboardData {
    salesSummary: {
      todayRevenue: number
      todayTransactions: number
      weekRevenue: number
      monthRevenue: number
      monthRevenueChange: number  // % vs bulan lalu
    }
    totalOutstandingDebt: number
    lowStockProducts: { id: string; name: string; stock: number; minStock: number }[]
    salesChart: { date: string; revenue: number }[]   // 30 hari terakhir
    topProducts: { name: string; totalQty: number; totalRevenue: number }[]  // 5 terlaris bulan ini
    debtByAging: { categoryName: string; color: string; total: number }[]
  }
  ```

- [ ] Buat `src/features/dashboard/services/dashboard.service.ts`:
  - `getDashboardData()` — jalankan semua query secara paralel (`Promise.all`):
    1. Total penjualan hari ini (transaksi PAID/PARTIAL hari ini)
    2. Total penjualan minggu ini
    3. Total penjualan bulan ini + bulan lalu (untuk % perubahan)
    4. Jumlah transaksi hari ini
    5. Total piutang outstanding (sum `remainingAmount` semua hutang UNPAID/PARTIAL)
    6. Produk dengan `stock <= minStock` dan `isActive = true`
    7. Data grafik: sum revenue per hari, 30 hari terakhir
    8. Top 5 produk: group by productId dari TransactionItem bulan ini, order by totalQty desc
    9. Hutang per aging bucket (reuse `getDebtReport()`)

- [ ] Buat `src/features/dashboard/hooks/useDashboard.ts`:
  - Fetch `/api/dashboard` (atau buat endpoint khusus)
  - Return `{ data, isLoading, error, refetch }`

---

## 7.3 — Dashboard API

- [ ] Buat `src/app/api/dashboard/route.ts`:
  - `GET` — panggil `getDashboardData()`, return semua data dalam satu response
  - Tidak perlu pagination (data sudah di-limit di service)

---

## 7.4 — Dashboard UI Components

- [ ] Buat `src/features/dashboard/components/SalesCard.tsx`:
  - Props: `title`, `value: number`, `change?: number` (persentase), `period: string`
  - Format value sebagai Rupiah
  - Tampilkan arrow naik (hijau) atau turun (merah) + persentase perubahan
  - Gunakan shadcn `Card`

- [ ] Buat `src/features/dashboard/components/DebtSummaryCard.tsx`:
  - Tampilkan total piutang outstanding (format Rupiah, warna merah)
  - Tampilkan breakdown per aging bucket (mini bar atau list)

- [ ] Buat `src/features/dashboard/components/TopProductsTable.tsx`:
  - Tabel 5 produk terlaris bulan ini
  - Kolom: Rank, Nama Produk, Total Qty, Total Revenue
  - Tanpa pagination (hanya 5 baris)

- [ ] Buat `src/features/dashboard/components/SalesChart.tsx`:
  - Line chart atau bar chart penjualan 30 hari terakhir
  - Gunakan Recharts `AreaChart` atau `BarChart`
  - X-axis: tanggal (format "DD MMM")
  - Y-axis: revenue (format Rupiah singkat: "1.5jt")
  - Tooltip: tanggal + revenue lengkap
  - Responsive (gunakan `ResponsiveContainer`)

- [ ] Buat `src/features/dashboard/components/LowStockAlert.tsx`:
  - Tampilkan jika ada produk dengan stok rendah
  - List produk: nama, stok saat ini, min stok
  - Link ke halaman produk dengan filter stok rendah

### Update Dashboard Page
- [ ] Update `src/app/(dashboard)/page.tsx`:
  - Grid layout:
    - Row 1: 4 `SalesCard` (Penjualan Hari Ini, Minggu Ini, Bulan Ini, Jumlah Transaksi Hari Ini)
    - Row 2: `SalesChart` (lebar penuh atau 2/3) + `DebtSummaryCard` (1/3)
    - Row 3: `TopProductsTable` (1/2) + `LowStockAlert` (1/2)
  - Loading skeleton saat fetch
  - Auto-refresh opsional (setiap 5 menit)

---

## 7.5 — Report UI Components & Page

- [ ] Buat `src/features/reports/components/ReportFilters.tsx`:
  - Props: `onFilter(filters)`, `showGroupBy?: boolean`, `showCategory?: boolean`
  - Fields: `DateRangePicker`, groupBy Select (jika `showGroupBy`), kategori Select (jika `showCategory`)
  - Tombol "Terapkan Filter"

- [ ] Buat `src/features/reports/components/SalesReport.tsx`:
  - `ReportFilters` dengan groupBy
  - Summary cards: Total Revenue, Total Transaksi, Rata-rata per Transaksi
  - Bar/Line chart revenue per periode
  - Tabel data: tanggal, jumlah transaksi, total revenue

- [ ] Buat `src/features/reports/components/ProductReport.tsx`:
  - `ReportFilters` dengan filter kategori
  - Tabel produk terlaris: rank, nama, kategori, total qty, total revenue, total profit
  - Sortable columns

- [ ] Buat `src/features/reports/components/DebtReport.tsx`:
  - Summary: total outstanding, jumlah customer berpiutang
  - Bar chart atau pie chart breakdown per aging bucket (warna sesuai aging category)
  - Tabel detail: aging category, jumlah hutang, total outstanding

- [ ] Buat `src/features/reports/components/ProfitReport.tsx`:
  - `ReportFilters`
  - Summary cards: Total Revenue, Total HPP, Total Profit, Margin (%)
  - Area chart: revenue vs HPP vs profit per hari
  - Tabel: tanggal, revenue, HPP, profit

### Page
- [ ] Buat `src/app/(dashboard)/reports/page.tsx`:
  - `PageWrapper` dengan judul "Laporan"
  - shadcn `Tabs`: Penjualan | Produk | Hutang | Profit
  - Setiap tab render komponen laporan yang sesuai
  - State filter per tab (tidak saling mempengaruhi)

---

## Checklist Akhir Sprint 7

- [ ] Dashboard menampilkan semua data real-time
- [ ] `SalesChart` render dengan data 30 hari terakhir
- [ ] `LowStockAlert` muncul jika ada produk stok rendah
- [ ] Laporan Penjualan: filter tanggal + groupBy berfungsi, grafik tampil
- [ ] Laporan Produk: tabel terlaris dengan filter kategori
- [ ] Laporan Hutang: breakdown per aging bucket dengan warna
- [ ] Laporan Profit: revenue, HPP, profit dengan grafik
- [ ] Semua laporan menggunakan data dari DB (bukan dummy)
