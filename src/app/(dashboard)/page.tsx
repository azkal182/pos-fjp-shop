"use client"

import { PageWrapper } from "@/components/layout/PageWrapper"
import { SalesCard } from "@/features/dashboard/components/SalesCard"
import { SalesChart } from "@/features/dashboard/components/SalesChart"
import { DebtSummaryCard } from "@/features/dashboard/components/DebtSummaryCard"
import { VendorDebtCard } from "@/features/dashboard/components/VendorDebtCard"
import { TopProductsTable } from "@/features/dashboard/components/TopProductsTable"
import { LowStockAlert } from "@/features/dashboard/components/LowStockAlert"
import { useDashboard } from "@/features/dashboard/hooks/useDashboard"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export default function DashboardPage() {
  const { data, isLoading, refetch } = useDashboard()

  return (
    <PageWrapper
      title="Dashboard"
      actions={
        <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {/* Row 1: Sales summary cards — 1 col mobile, 2 col sm, 3 col lg, 6 col xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SalesCard
          title="Penjualan Hari Ini"
          value={data?.salesSummary.todayRevenue ?? 0}
          isLoading={isLoading}
          subtitle="Nilai penjualan (accrual)"
        />
        <SalesCard
          title="Kas Masuk Hari Ini"
          value={data?.salesSummary.todayCashCollected ?? 0}
          isLoading={isLoading}
          subtitle="Uang yang diterima"
          variant="cash"
        />
        <SalesCard
          title="Piutang Baru"
          value={data?.salesSummary.todayNewDebt ?? 0}
          isLoading={isLoading}
          subtitle="Belum dibayar hari ini"
          variant="debt"
        />
        <SalesCard
          title="Transaksi Hari Ini"
          value={data?.salesSummary.todayTransactions ?? 0}
          isCount
          isLoading={isLoading}
        />
        <SalesCard
          title="Penjualan Minggu Ini"
          value={data?.salesSummary.weekRevenue ?? 0}
          isLoading={isLoading}
        />
        <SalesCard
          title="Penjualan Bulan Ini"
          value={data?.salesSummary.monthRevenue ?? 0}
          change={data?.salesSummary.monthRevenueChange}
          period="bulan lalu"
          isLoading={isLoading}
        />
      </div>

      {/* Row 2: Chart (6) + Piutang (3) + Hutang Vendor (3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6">
          <SalesChart data={data?.salesChart ?? []} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-3">
          <DebtSummaryCard
            totalOutstanding={data?.totalOutstandingDebt ?? 0}
            debtByAging={data?.debtByAging ?? []}
            isLoading={isLoading}
          />
        </div>
        <div className="lg:col-span-3">
          <VendorDebtCard
            totalOutstanding={data?.vendorDebtSummary.totalOutstanding ?? 0}
            vendorCount={data?.vendorDebtSummary.vendorCount ?? 0}
            topVendors={data?.vendorDebtSummary.topVendors ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Row 4: Top products + Low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProductsTable products={data?.topProducts ?? []} isLoading={isLoading} />
        <LowStockAlert products={data?.lowStockProducts ?? []} isLoading={isLoading} />
      </div>
    </PageWrapper>
  )
}
