"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Pencil, User, Phone, MapPin } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { CustomerDebtSummary } from "@/features/customers/components/CustomerDebtSummary"
import { CustomerForm } from "@/features/customers/components/CustomerForm"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useToast } from "@/hooks/useToast"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { CreateCustomerInput } from "@/features/customers/schemas/customer.schema"

interface Transaction {
  id: string
  code: string
  totalAmount: number
  paidAmount: number
  paymentStatus: string
  transactionDate: string
}

interface ActiveDebt {
  id: string
  originalAmount: number
  remainingAmount: number
  status: string
  debtDate: string
  transaction: { code: string }
}

interface CustomerDetail {
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
  transactions: Transaction[]
  debts: ActiveDebt[]
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = params.id as string

  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  async function fetchCustomer() {
    try {
      const res = await fetch(`/api/customers/${id}`)
      if (!res.ok) { router.push("/customers"); return }
      const json = await res.json()
      setCustomer(json.data)
    } catch {
      router.push("/customers")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchCustomer() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpdate(formData: CreateCustomerInput) {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal mengupdate customer")
      toast.success("Customer berhasil diupdate")
      setIsEditOpen(false)
      fetchCustomer()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsUpdating(false)
    }
  }

  const transactionColumns: Column<Transaction>[] = [
    {
      header: "Kode",
      render: (row) => (
        <Link href={`/transactions/${row.id}`} className="font-mono text-xs hover:underline text-primary">
          {row.code}
        </Link>
      ),
    },
    {
      header: "Tanggal",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.transactionDate), "dd MMM yyyy", { locale: idLocale })}
        </span>
      ),
    },
    {
      header: "Total",
      render: (row) => <CurrencyDisplay amount={Number(row.totalAmount)} className="text-sm" />,
    },
    {
      header: "Status",
      render: (row) => <StatusBadge status={row.paymentStatus} />,
    },
  ]

  const debtColumns: Column<ActiveDebt>[] = [
    {
      header: "Transaksi",
      render: (row) => (
        <span className="font-mono text-xs">{row.transaction.code}</span>
      ),
    },
    {
      header: "Tanggal",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.debtDate), "dd MMM yyyy", { locale: idLocale })}
        </span>
      ),
    },
    {
      header: "Sisa Hutang",
      render: (row) => (
        <CurrencyDisplay
          amount={Number(row.remainingAmount)}
          className="text-sm font-semibold text-red-600"
        />
      ),
    },
    {
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "",
      className: "w-[80px] text-right",
      render: (row) => (
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
          <Link href={`/debts/${id}`}>Detail</Link>
        </Button>
      ),
    },
  ]

  if (isLoading) return <LoadingSpinner centered />
  if (!customer) return null

  return (
    <PageWrapper
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <Button onClick={() => setIsEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Customer
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info Customer */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{customer.name}</CardTitle>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium mt-1 ${
                    customer.isActive
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  }`}>
                    {customer.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{customer.address}</span>
                </div>
              )}
              {!customer.phone && !customer.address && (
                <p className="text-sm text-muted-foreground">Tidak ada info kontak</p>
              )}
            </CardContent>
          </Card>

          {/* Ringkasan Hutang */}
          <CustomerDebtSummary customerId={id} />
        </div>

        {/* Tabs: Transaksi & Hutang */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="transactions">
            <TabsList className="w-full">
              <TabsTrigger value="transactions" className="flex-1">
                Riwayat Transaksi
                {customer.transactions.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                    {customer.transactions.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="debts" className="flex-1">
                Hutang Aktif
                {customer.debts.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-100 text-red-700 px-1.5 py-0.5 text-xs">
                    {customer.debts.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-4">
              <DataTable
                columns={transactionColumns}
                data={customer.transactions}
                emptyMessage="Belum ada transaksi"
                emptyDescription="Transaksi customer akan muncul di sini"
                keyExtractor={(row) => row.id}
              />
              {customer.transactions.length === 5 && (
                <div className="mt-3 text-center">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/transactions?customerId=${id}`}>
                      Lihat semua transaksi →
                    </Link>
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="debts" className="mt-4">
              <DataTable
                columns={debtColumns}
                data={customer.debts}
                emptyMessage="Tidak ada hutang aktif"
                emptyDescription="Semua hutang customer sudah lunas"
                keyExtractor={(row) => row.id}
              />
              {customer.debts.length > 0 && (
                <div className="mt-3 text-center">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/debts/${id}`}>
                      Kelola hutang customer →
                    </Link>
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CustomerForm
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        defaultValues={{
          name: customer.name,
          phone: customer.phone ?? "",
          address: customer.address ?? "",
          isActive: customer.isActive,
        }}
        onSubmit={handleUpdate}
        isLoading={isUpdating}
        mode="edit"
      />
    </PageWrapper>
  )
}
