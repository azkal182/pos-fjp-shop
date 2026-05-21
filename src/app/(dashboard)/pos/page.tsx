"use client"

import { useState, useEffect } from "react"
import { CreditCard, ShoppingBag, SlidersHorizontal, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
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
  const { items, customerId, paymentMethod, paidAmount, totalAmount, discountAmount, clearCart } = useCartStore()

  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<TransactionResult | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)

  const total = totalAmount()
  const cartEmpty = items.length === 0
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const totalProducts = items.length // jumlah jenis produk

  // Prevent navigation jika ada item di keranjang
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (items.length > 0) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [items.length])

  async function handleCheckout(opts: { overpayAction: "return" | "deposit"; depositUsed: number; depositId?: string }) {
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
        overpayAction: opts.overpayAction,
        depositUsed: opts.depositUsed,
        depositId: opts.depositId,
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
      setIsPanelOpen(false)
      setIsReceiptOpen(true)
      toast.success("Transaksi berhasil!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Panel kasir — shared antara desktop sidebar dan mobile sheet
  const PanelContent = () => (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-visible px-4 py-4 space-y-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Customer</p>
          <CustomerSelect />
        </div>
        <Separator />
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ringkasan</p>
          <CartSummary />
        </div>
      </div>
      <div className="border-t bg-background p-4 space-y-3">
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
    </>
  )

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden bg-muted/20">
      {/* ── Kolom kiri: Search + Cart ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Search bar */}
        <div className="bg-background border-b px-3 py-3 sm:px-4">
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

        {/* Footer kiri — info + tombol kosongkan */}
        <div className="bg-background border-t px-3 py-2 sm:px-4 flex items-center justify-between gap-2">
          {!cartEmpty ? (
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{totalProducts}</span> produk
                {" · "}
                <span className="font-semibold text-foreground">{totalQty}</span> item
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive gap-1 px-2"
                onClick={() => setIsClearConfirmOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Kosongkan
              </Button>
            </div>
          ) : (
            <span />
          )}

          {/* Mobile: tombol buka panel kasir */}
          <Button
            variant="default"
            size="sm"
            className="sm:hidden gap-2 h-9"
            disabled={cartEmpty}
            onClick={() => setIsPanelOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Kasir
            {!cartEmpty && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {totalQty}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* ── Desktop: Panel kasir ── */}
      <div className="hidden sm:flex w-[300px] lg:w-[320px] flex-col bg-background border-l">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Panel Kasir</h2>
        </div>
        <PanelContent />
      </div>

      {/* ── Mobile: Panel kasir (bottom sheet) ── */}
      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 rounded-t-xl">
          <SheetHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Panel Kasir
              </SheetTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsPanelOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
          <PanelContent />
        </SheetContent>
      </Sheet>

      {/* Confirm kosongkan keranjang */}
      <ConfirmDialog
        open={isClearConfirmOpen}
        onConfirm={() => { clearCart(); setIsClearConfirmOpen(false) }}
        onCancel={() => setIsClearConfirmOpen(false)}
        title="Kosongkan Keranjang"
        description="Semua item di keranjang akan dihapus. Lanjutkan?"
        confirmLabel="Kosongkan"
      />

      {/* Payment Modal */}
      <PaymentModal
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        onConfirm={handleCheckout}
        isSubmitting={isSubmitting}
      />

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-sm max-w-[95vw]">
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
