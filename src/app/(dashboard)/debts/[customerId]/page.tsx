"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { DebtTable } from "@/features/debts/components/DebtTable"
import { CustomerDebtSummary } from "@/features/customers/components/CustomerDebtSummary"
import { CustomerLedger } from "@/features/debts/components/CustomerLedger"
import { DepositCard } from "@/features/deposits/components/DepositCard"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useToast } from "@/hooks/useToast"
import type { PaginationMeta } from "@/types"

interface Customer {
  id: string
  name: string
  phone: string | null
}

interface DebtRow {
  id: string
  customerId: string
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  status: string
  debtDate: Date | string
  aging: any
  customer: { id: string; name: string; phone: string | null }
  transaction: { code: string }
}

export default function CustomerDebtsPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const customerId = params.customerId as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [debts, setDebts] = useState<DebtRow[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: "", status: "" })
  const [ledgerRefreshKey, setLedgerRefreshKey] = useState(0)

  useEffect(() => {
    fetch(`/api/customers/${customerId}`)
      .then((r) => r.json())
      .then((json) => setCustomer(json.data ? { id: json.data.id, name: json.data.name, phone: json.data.phone } : null))
      .catch(() => router.push("/debts"))
  }, [customerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDebts = useCallback(async () => {
    setIsLoading(true)
    try {
      const p = new URLSearchParams()
      p.set("customerId", customerId)
      p.set("page", String(page))
      if (filters.status) p.set("status", filters.status)
      const res = await fetch(`/api/debts?${p}`)
      const json = await res.json()
      setDebts(json.data ?? [])
      setMeta(json.meta)
    } catch {
      toast.error("Gagal memuat hutang")
    } finally {
      setIsLoading(false)
    }
  }, [customerId, page, filters.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDebts() }, [fetchDebts])
  useEffect(() => { setPage(1) }, [filters.status])

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function handlePaymentSuccess() {
    fetchDebts()
    setLedgerRefreshKey((k) => k + 1)
  }

  if (!customer) return <LoadingSpinner centered />

  return (
    <PageWrapper
      title={`Hutang — ${customer.name}`}
      actions={
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{customer.name}</p>
                {customer.phone && (
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href={`/customers/${customerId}`}>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <CustomerDebtSummary customerId={customerId} />
          <DepositCard partyType="CUSTOMER" partyId={customerId} refreshKey={ledgerRefreshKey} />
        </div>

        {/* Main content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="ledger">
            <TabsList className="w-full">
              <TabsTrigger value="ledger" className="flex-1">Buku Hutang</TabsTrigger>
              <TabsTrigger value="debts" className="flex-1">Per Transaksi</TabsTrigger>
            </TabsList>

            {/* Tab Buku Hutang — tampilan kredit/debit */}
            <TabsContent value="ledger" className="mt-4">
              <CustomerLedger customerId={customerId} refreshKey={ledgerRefreshKey} />
            </TabsContent>

            {/* Tab Per Transaksi — detail hutang per TRX */}
            <TabsContent value="debts" className="mt-4">
              <DebtTable
                data={debts}
                meta={meta}
                isLoading={isLoading}
                isGlobal={false}
                filters={filters}
                onFilterChange={setFilter}
                onPageChange={setPage}
                onRefetch={handlePaymentSuccess}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageWrapper>
  )
}
