"use client"

import { useEffect } from "react"
import { Printer, ShoppingCart, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { useSettingsStore } from "@/stores/settings.store"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

export interface ReceiptData {
  id: string
  code: string
  totalAmount: number
  subtotal: number
  discountAmount: number
  packingFee?: number
  paidAmount: number
  changeAmount: number
  debtAmount: number
  paymentMethod: string
  paymentStatus: string
  transactionDate: string
  customer: { name: string } | null
  items: {
    id: string
    productName: string
    quantity: number
    sellPrice: number
    discountAmount: number
    subtotal: number
  }[]
}

interface ReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: ReceiptData | null
  onNewTransaction?: () => void
  newTransactionLabel?: string
}

export function ReceiptDialog({
  open, onOpenChange, transaction, onNewTransaction, newTransactionLabel = "Transaksi Baru",
}: ReceiptDialogProps) {
  const { store, load } = useSettingsStore()
  useEffect(() => { load() }, [load])

  if (!transaction) return null

  function handlePrint() {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Struk Transaksi
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header struk */}
          <div className="text-center space-y-1">
            <h2 className="font-bold text-lg">{store.storeName}</h2>
            {store.storeAddress && <p className="text-xs text-muted-foreground">{store.storeAddress}</p>}
            {store.storePhone && <p className="text-xs text-muted-foreground">{store.storePhone}</p>}
            <p className="text-xs text-muted-foreground font-mono">{transaction.code}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(transaction.transactionDate), "dd MMMM yyyy HH:mm", { locale: idLocale })}
            </p>
            <p className="text-xs">
              Customer: <span className="font-medium">{transaction.customer?.name ?? "Walk-in"}</span>
            </p>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-1.5">
            {transaction.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm gap-2">
                <div className="min-w-0">
                  <p className="truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × <CurrencyDisplay amount={item.sellPrice} className="text-xs" />
                    {item.discountAmount > 0 && (
                      <span className="ml-1 text-red-500">
                        (−<CurrencyDisplay amount={item.discountAmount} className="text-xs" />)
                      </span>
                    )}
                  </p>
                </div>
                <CurrencyDisplay amount={item.subtotal} className="text-sm shrink-0" />
              </div>
            ))}
          </div>

          <Separator />

          {/* Summary */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <CurrencyDisplay amount={Number(transaction.subtotal)} />
            </div>
            {Number(transaction.discountAmount) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Diskon</span>
                <span>−<CurrencyDisplay amount={Number(transaction.discountAmount)} className="text-sm" /></span>
              </div>
            )}
            {Number(transaction.packingFee ?? 0) > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>Biaya Packing</span>
                <span>+<CurrencyDisplay amount={Number(transaction.packingFee)} className="text-sm" /></span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <CurrencyDisplay amount={Number(transaction.totalAmount)} className="font-bold" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Bayar ({transaction.paymentMethod === "CASH" ? "Tunai" : "Transfer"})
              </span>
              <CurrencyDisplay amount={Number(transaction.paidAmount)} />
            </div>
            {Number(transaction.changeAmount) > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Kembalian</span>
                <CurrencyDisplay amount={Number(transaction.changeAmount)} className="text-sm font-semibold" />
              </div>
            )}
            {Number(transaction.debtAmount) > 0 && (
              <div className="flex justify-between text-red-600 font-medium">
                <span>Hutang</span>
                <CurrencyDisplay amount={Number(transaction.debtAmount)} className="text-sm font-semibold" />
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <StatusBadge status={transaction.paymentStatus} />
          </div>

          <Separator />

          {store.receiptNote && (
            <p className="text-xs text-center text-muted-foreground">{store.receiptNote}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            {onNewTransaction && (
              <Button className="flex-1" onClick={onNewTransaction}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                {newTransactionLabel}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
