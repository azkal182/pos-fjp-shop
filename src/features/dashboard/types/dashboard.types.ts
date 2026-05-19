export interface DashboardData {
  salesSummary: {
    todayRevenue: number
    todayTransactions: number
    weekRevenue: number
    monthRevenue: number
    monthRevenueChange: number
  }
  totalOutstandingDebt: number
  lowStockProducts: { id: string; name: string; stock: number; minStock: number }[]
  salesChart: { date: string; revenue: number }[]
  topProducts: { productId: string; name: string; totalQty: number; totalRevenue: number }[]
  debtByAging: { categoryName: string; color: string; total: number }[]
}
