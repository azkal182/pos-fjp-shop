export interface DashboardData {
  salesSummary: {
    // Accrual: nilai penjualan (totalAmount semua transaksi CONFIRMED)
    todayRevenue: number
    todayTransactions: number
    weekRevenue: number
    monthRevenue: number
    monthRevenueChange: number
    // Cash Basis: uang yang benar-benar masuk hari ini
    todayCashCollected: number
    // Piutang baru hari ini
    todayNewDebt: number
  }
  totalOutstandingDebt: number
  vendorDebtSummary: {
    totalOutstanding: number
    vendorCount: number
    topVendors: { vendorId: string; vendorName: string; totalOutstanding: number }[]
  }
  lowStockProducts: { id: string; name: string; stock: number; minStock: number }[]
  salesChart: { date: string; revenue: number; cashCollected: number }[]
  topProducts: { productId: string; name: string; totalQty: number; totalRevenue: number }[]
  debtByAging: { categoryName: string; color: string; total: number }[]
}
