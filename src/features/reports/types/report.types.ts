export interface SalesDataPoint {
  date: string
  totalRevenue: number
  transactionCount: number
}

export interface SalesReport {
  data: SalesDataPoint[]
  totalRevenue: number
  totalTransactions: number
  comparisonRevenue: number
  revenueChange: number
}

export interface ProductReportItem {
  productId: string
  productCode: string
  productName: string
  categoryName: string
  totalQty: number
  totalRevenue: number
  totalProfit: number
}

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

export interface ProfitReport {
  totalRevenue: number
  totalHPP: number
  totalProfit: number
  profitMargin: number
  data: { date: string; revenue: number; hpp: number; profit: number }[]
}
