"use client"

import { useState, useEffect, useCallback } from "react"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { TransactionTable } from "@/features/transactions/components/TransactionTable"
import { useDebounce } from "@/hooks/useDebounce"
import { useToast } from "@/hooks/useToast"
import type { PaginationMeta } from "@/types"

interface Transaction {
  id: string
  code: string
  totalAmount: number
  paidAmount: number
  paymentStatus: string
  paymentMethod: string
  transactionDate: string
  customer: { id: string; name: string } | null
}

export default function TransactionsPage() {
  const toast = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    search: "",
    paymentStatus: "",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  })
  const debouncedSearch = useDebounce(filters.search, 400)

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus)
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom.toISOString())
      if (filters.dateTo) params.set("dateTo", filters.dateTo.toISOString())
      const res = await fetch(`/api/transactions?${params}`)
      const json = await res.json()
      setTransactions(json.data ?? [])
      setMeta(json.meta)
    } catch {
      toast.error("Gagal memuat transaksi")
    } finally {
      setIsLoading(false)
    }
  }, [page, filters.paymentStatus, filters.dateFrom, filters.dateTo]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchTransactions() }, [fetchTransactions])
  useEffect(() => { setPage(1) }, [filters.paymentStatus, filters.dateFrom, filters.dateTo, debouncedSearch])

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function setDateRange(range: { from?: Date; to?: Date }) {
    setFilters((prev) => ({ ...prev, dateFrom: range.from, dateTo: range.to }))
  }

  return (
    <PageWrapper title="Transaksi">
      <TransactionTable
        data={transactions}
        meta={meta}
        isLoading={isLoading}
        filters={filters}
        onFilterChange={setFilter}
        onDateRangeChange={setDateRange}
        onPageChange={setPage}
      />
    </PageWrapper>
  )
}
