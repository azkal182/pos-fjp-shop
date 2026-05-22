"use client"

import { useState, useEffect } from "react"
import { ShoppingBag, SlidersHorizontal, X, Trash2, ClipboardList, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { ProductSearch } from "@/features/pos/components/ProductSearch"
import { CartItem } from "@/features/pos/components/CartItem"
import { CartSummary } from "@/features/pos/components/CartSummary"
import { CustomerSelect } from "@/features/pos/components/CustomerSelect"
import { useCartStore } from "@/features/pos/stores/cart.store"
import { useToast } from "@/hooks/useToast"

export default function POSPage() {
  const router = useRouter()
  const toast = useToast()
  const { items, customerId, discountAmount, totalAmount, clearCart } = useCartStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)
  // Dialog konfirmasi walk-in sebelum simpan
  const [showWalkInConfirm, setShowWalkInConfirm] = useState(false)
  // Dialog setelah simpan draft
  const [savedDraft, setSavedDraft] = useState<{ id: string; code: string } | null>(null)

  const total = totalAmount()
  const cartEmpty = items.length === 0
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const totalProducts = items.length

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

  async function handleSaveDraft() {
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
        discountAmount,
      }
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan order")

      clearCart()
      // Tampilkan dialog pilihan
      setSavedDraft({ id: json.data.id, code: json.data.code })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Panel kasir
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
          <span className="text-sm font-medium text-muted-foreground">Total Produk</span>
          <CurrencyDisplay
            amount={total}
            className={`text-xl font-bold ${cartEmpty ? "text-muted-foreground" : "text-foreground"}`}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Biaya packing & pembayaran diisi saat konfirmasi
        </p>
        <Button
          className="w-full h-11 text-sm font-semibold gap-2"
          disabled={cartEmpty || isSubmitting}
          onClick={() => {
            // Jika tidak ada customer, tampilkan konfirmasi walk-in dulu
            if (!customerId) {
              setShowWalkInConfirm(true)
            } else {
              handleSaveDraft()
            }
          }}
        >
          <ClipboardList className="h-4 w-4" />
          {isSubmitting ? "Menyimpan..." : "Simpan Order"}
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

        {/* Footer kiri */}
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
            /* Tombol ke daftar draft saat keranjang kosong */
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground"
              onClick={() => router.push("/transactions/pending")}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Lihat Order Pending
            </Button>
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
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Panel Kasir</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={() => router.push("/transactions/pending")}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Draft
          </Button>
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
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={() => { setIsPanelOpen(false); router.push("/transactions/pending") }}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Draft
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsPanelOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
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

      {/* Dialog konfirmasi walk-in */}
      <Dialog open={showWalkInConfirm} onOpenChange={setShowWalkInConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-amber-500" />
              Transaksi Walk-in
            </DialogTitle>
            <DialogDescription>
              Tidak ada customer yang dipilih.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-3 space-y-1.5 text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-400">Perhatian — Walk-in:</p>
              <ul className="space-y-1 text-amber-700 dark:text-amber-400 text-xs list-disc list-inside">
                <li>Transaksi ini tidak terhubung ke customer manapun</li>
                <li>Tidak bisa hutang — harus bayar lunas saat konfirmasi</li>
                <li>Tidak bisa menggunakan atau menyimpan deposit</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              Ingin pilih customer terlebih dahulu, atau lanjut sebagai walk-in?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowWalkInConfirm(false)}
              >
                Pilih Customer Dulu
              </Button>
              <Button
                className="w-full gap-2"
                onClick={() => {
                  setShowWalkInConfirm(false)
                  handleSaveDraft()
                }}
                disabled={isSubmitting}
              >
                <ClipboardList className="h-4 w-4" />
                Lanjut Walk-in
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog setelah simpan draft */}
      <Dialog open={!!savedDraft} onOpenChange={(open) => !open && setSavedDraft(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Order Berhasil Disimpan
            </DialogTitle>
            <DialogDescription>
              Order <span className="font-mono font-semibold">{savedDraft?.code}</span> tersimpan sebagai draft.
              Lanjut ke konfirmasi sekarang atau nanti?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-1">
            <Button
              className="w-full gap-2"
              onClick={() => {
                setSavedDraft(null)
                router.push(`/transactions/${savedDraft?.id}/confirm`)
              }}
            >
              <ArrowRight className="h-4 w-4" />
              Konfirmasi Sekarang
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setSavedDraft(null)
                router.push("/transactions/pending")
              }}
            >
              <ClipboardList className="h-4 w-4" />
              Lihat Semua Draft
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setSavedDraft(null)}
            >
              Tetap di Kasir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
