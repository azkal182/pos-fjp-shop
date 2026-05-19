"use client"

import { useState } from "react"
import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/shared/EmptyState"
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
    totalAmount, discountAmount, isWalkIn, debtAmount,
  } = useCartStore()

  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<TransactionResult | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  const total = totalAmount()
  const walkIn = isWalkIn()
  const debt = debtAmount()
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
        discountAmount: discountAmount,
        notes: undefined,
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
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      {/* Kolom kiri — Produk & Cart */}
      <div className="flex-1 flex flex-col overflow-hidden border-r">
        {/* Search */}
        <div className="p-4 border-b">
          <ProductSearch />
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <EmptyState
              title="Keranjang kosong"
              description="Cari dan tambahkan produk di atas"
            />
          ) : (
            <div>
              {items.map((item) => (
                <CartItem key={item.productId} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Kolom kanan — Customer, Summary, Bayar */}
      <div className="w-80 flex flex-col bg-muted/10">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Customer */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm">Customer</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <CustomerSelect />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm">Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <CartSummary />
            </CardContent>
          </Card>
        </div>

        {/* Tombol Bayar */}
        <div className="p-4 border-t bg-background">
          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={cartEmpty || (walkIn && debt > 0)}
            onClick={() => setIsPaymentOpen(true)}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Bayar{!cartEmpty && ` — Rp ${total.toLocaleString("id-ID")}`}
          </Button>
          {walkIn && debt > 0 && (
            <p className="text-xs text-destructive text-center mt-1">
              Walk-in harus bayar lunas
            </p>
          )}
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
            <DialogTitle>Struk Transaksi</DialogTitle>
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
