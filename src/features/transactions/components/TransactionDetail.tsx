import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface TransactionItem {
  id: string
  productName: string
  quantity: number
  sellPrice: number
  buyPrice: number
  discountAmount: number
  subtotal: number
  product: { code: string; unit: string }
}

interface DebtPayment {
  id: string
  amount: number
  paymentDate: string
  source: string
}

interface TransactionDetailData {
  id: string
  code: string
  subtotal: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  changeAmount: number
  debtAmount: number
  paymentMethod: string
  paymentStatus: string
  notes: string | null
  transactionDate: string
  customer: { id: string; name: string; phone: string | null } | null
  user: { name: string }
  items: TransactionItem[]
  debt: {
    id: string
    originalAmount: number
    paidAmount: number
    remainingAmount: number
    status: string
    payments: DebtPayment[]
  } | null
}

interface TransactionDetailProps {
  transaction: TransactionDetailData
}

export function TransactionDetail({ transaction }: TransactionDetailProps) {
  const itemColumns: Column<TransactionItem>[] = [
    {
      header: "Produk",
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.productName}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.product.code} · {row.product.unit}</p>
        </div>
      ),
    },
    {
      header: "Qty",
      render: (row) => <span className="text-sm">{row.quantity}</span>,
    },
    {
      header: "Harga",
      render: (row) => (
        <div>
          <CurrencyDisplay amount={Number(row.sellPrice)} className="text-sm" />
          {Number(row.discountAmount) > 0 && (
            <p className="text-xs text-red-500">−<CurrencyDisplay amount={Number(row.discountAmount)} className="text-xs" /></p>
          )}
        </div>
      ),
    },
    {
      header: "Subtotal",
      render: (row) => <CurrencyDisplay amount={Number(row.subtotal)} className="font-medium" />,
    },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Info Transaksi */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-mono">{transaction.code}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {format(new Date(transaction.transactionDate), "dd MMMM yyyy HH:mm", { locale: idLocale })}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">{transaction.customer?.name ?? "Walk-in"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Kasir</span>
              <span>{transaction.user.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Metode</span>
              <span>{transaction.paymentMethod === "CASH" ? "Tunai" : "Transfer"}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={transaction.paymentStatus} />
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <CurrencyDisplay amount={Number(transaction.subtotal)} />
            </div>
            {Number(transaction.discountAmount) > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Diskon</span>
                <span>−<CurrencyDisplay amount={Number(transaction.discountAmount)} className="text-sm" /></span>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <CurrencyDisplay amount={Number(transaction.totalAmount)} className="font-bold" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bayar</span>
              <CurrencyDisplay amount={Number(transaction.paidAmount)} />
            </div>
            {Number(transaction.changeAmount) > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Kembalian</span>
                <CurrencyDisplay amount={Number(transaction.changeAmount)} className="text-sm" />
              </div>
            )}
            {Number(transaction.debtAmount) > 0 && (
              <div className="flex justify-between text-sm text-red-600 font-medium">
                <span>Hutang</span>
                <CurrencyDisplay amount={Number(transaction.debtAmount)} className="text-sm" />
              </div>
            )}
            {transaction.notes && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground">{transaction.notes}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Info Hutang */}
        {transaction.debt && (
          <Card className="border-red-200">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm text-red-700">Info Hutang</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Original</span>
                <CurrencyDisplay amount={Number(transaction.debt.originalAmount)} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Terbayar</span>
                <CurrencyDisplay amount={Number(transaction.debt.paidAmount)} />
              </div>
              <div className="flex justify-between text-sm font-medium text-red-600">
                <span>Sisa</span>
                <CurrencyDisplay amount={Number(transaction.debt.remainingAmount)} />
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={transaction.debt.status} />
              </div>
              {transaction.debt.payments.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground">Riwayat Pembayaran</p>
                  {transaction.debt.payments.map((p) => (
                    <div key={p.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {format(new Date(p.paymentDate), "dd MMM yyyy", { locale: idLocale })}
                        {p.source === "POS_OVERPAYMENT" && " (Overpay)"}
                      </span>
                      <CurrencyDisplay amount={Number(p.amount)} className="text-xs" />
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Items */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Item Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <DataTable
                columns={itemColumns}
                data={transaction.items}
                emptyMessage="Tidak ada item"
                keyExtractor={(row) => row.id}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
