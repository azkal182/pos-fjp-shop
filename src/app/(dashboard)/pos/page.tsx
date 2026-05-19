"use client"

import { useState } from "react"
import { CreditCard, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { ProductSearch } from "@/features/pos/components/ProductSearch"
import { CartItem } from "@/features/pos/components/CartItem"
import { CartSummary } from "@/features/pos/components/CartSummary"
import { CustomerSelect } from "@/features/pos/components/CustomerSelect"
import { PaymentModal } from "@/features/pos/components/PaymentModal"
import { Receipt } from "@/features/pos/components/Receipt"
import { useCartStore } from "@/features/pos/stores/cart.store"
import { useToast } from "@/hooks/useToast"

interface TransactionResult {
  id: string
  code: string
  totalAmount: number
  subtotal: number
  discountAmount: number
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

export default function POSPage() {
  const toast = useToast()
  const {
    items, customerId, paymentMethod, paidAmount,
    totalAmount, discountAmount,
  } = useCartStore()

  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<TransactionResult | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  const total = totalAmount()
  const cartEmpty = items.length === 0

  async function handleCheckout() {
    setIsSubmitting(true)
    try {
      const payload = {
        customerId: customerId ?? undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          sellPrice: i.sellPrice,
          discountAmount: i.discountAmount,
        })),
        paidAmount,
        paymentMethod,
        discountAmount,
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Checkout gagal")

      setLastTransaction(json.data)
      setIsPaymentOpen(false)
      setIsReceiptOpen(true)
      toast.success("Transaksi berhasil!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden bg-muted/20">
      {/* ── Kolom kiri: Search + Cart ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search bar */}
        <div className="bg-background border-b px-4 py-3">
          <ProductSearch />
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cartEmpty ? (
            <div className="flex items-center justify-center h-full">
              <EmptyState
                title="Keranjang kosong"
                description="Cari produk di atas untuk mulai transaksi"
              />
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <CartItem key={item.productId} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Footer kiri: jumlah item */}
        {!cartEmpty && (
          <div className="bg-background border-t px-4 py-2">
            <p className="text-xs text-muted-foreground">
              {items.length} jenis produk · {items.reduce((s, i) => s + i.quantity, 0)} item
            </p>
          </div>
        )}
      </div>

      {/* ── Kolom kanan: Panel kasir ── */}
      <div className="w-[320px] flex flex-col bg-background border-l">
        {/* Header panel */}
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Panel Kasir</h2>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-visible px-4 py-4 space-y-5">
          {/* Customer */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Customer</p>
            <CustomerSelect />
          </div>

          <Separator />

          {/* Summary */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ringkasan</p>
            <CartSummary />
          </div>
        </div>

        {/* Footer: Tombol Bayar */}
        <div className="border-t bg-background p-4 space-y-3">
          {/* Total besar */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Tagihan</span>
            <CurrencyDisplay
              amount={total}
              className={`text-xl font-bold ${cartEmpty ? "text-muted-foreground" : "text-foreground"}`}
            />
          </div>

          <Button
            className="w-full h-11 text-sm font-semibold gap-2"
            disabled={cartEmpty}
            onClick={() => setIsPaymentOpen(true)}
          >
            <CreditCard className="h-4 w-4" />
            Proses Pembayaran
          </Button>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        onConfirm={handleCheckout}
        isSubmitting={isSubmitting}
      />

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Struk Transaksi
            </DialogTitle>
          </DialogHeader>
          {lastTransaction && (
            <Receipt
              transaction={lastTransaction}
              onClose={() => setIsReceiptOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
