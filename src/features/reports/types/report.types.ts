// ─── Sales Report ─────────────────────────────────────────────────────────────

export interface SalesDataPoint {
  date: string
  // Accrual: nilai penjualan (totalAmount semua transaksi CONFIRMED)
  totalRevenue: number
  transactionCount: number
  // Cash Basis: uang yang benar-benar masuk (paidAmount + pembayaran hutang)
  cashCollected: number
  // Piutang baru yang timbul hari ini
  newDebt: number
}

export interface SalesReport {
  data: SalesDataPoint[]
  // Accrual
  totalRevenue: number
  totalTransactions: number
  comparisonRevenue: number
  revenueChange: number
  // Cash Basis
  totalCashCollected: number
  totalNewDebt: number
  totalDebtPaymentsReceived: number
}

// ─── Product Report ───────────────────────────────────────────────────────────

export interface ProductReportItem {
  productId: string
  productCode: string
  productName: string
  categoryName: string
  totalQty: number
  totalRevenue: number   // accrual (semua transaksi termasuk hutang)
  totalProfit: number    // gross profit (revenue - HPP)
}

// ─── Debt Report ──────────────────────────────────────────────────────────────

export interface DebtReportBucket {
  categoryName: string
  color: string
  count: number
  totalOutstanding: number
}

export interface DebtReport {
  buckets: DebtReportBucket[]
  totalOutstanding: number
  totalCustomersWithDebt: number
}

// ─── Profit Report ────────────────────────────────────────────────────────────

export interface ProfitDataPoint {
  date: string
  // Accrual revenue (semua transaksi CONFIRMED)
  revenue: number
  // Cash revenue (hanya yang sudah dibayar + pembayaran hutang)
  cashRevenue: number
  hpp: number
  // Gross profit berdasarkan accrual
  profit: number
  // Gross profit berdasarkan cash
  cashProfit: number
}

export interface ProfitReport {
  // Accrual
  totalRevenue: number
  totalHPP: number
  totalProfit: number
  profitMargin: number
  // Cash Basis
  totalCashRevenue: number
  totalCashProfit: number
  cashProfitMargin: number
  // Piutang
  totalNewDebt: number
  totalDebtPaymentsReceived: number
  data: ProfitDataPoint[]
}
