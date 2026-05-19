"use client"

import { PageWrapper } from "@/components/layout/PageWrapper"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SalesReport } from "@/features/reports/components/SalesReport"
import { ProductReport } from "@/features/reports/components/ProductReport"
import { DebtReport } from "@/features/reports/components/DebtReport"
import { ProfitReport } from "@/features/reports/components/ProfitReport"

export default function ReportsPage() {
  return (
    <PageWrapper title="Laporan">
      <Tabs defaultValue="sales">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="sales">Penjualan</TabsTrigger>
          <TabsTrigger value="products">Produk</TabsTrigger>
          <TabsTrigger value="debts">Hutang</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-6">
          <SalesReport />
        </TabsContent>
        <TabsContent value="products" className="mt-6">
          <ProductReport />
        </TabsContent>
        <TabsContent value="debts" className="mt-6">
          <DebtReport />
        </TabsContent>
        <TabsContent value="profit" className="mt-6">
          <ProfitReport />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  )
}
