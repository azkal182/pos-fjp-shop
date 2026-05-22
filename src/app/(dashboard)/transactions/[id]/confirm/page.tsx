"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Loader2, CreditCard, Package, Wallet,
  AlertCircle, CheckCircle2, X, Banknote, Trash2, Pencil, Plus, Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { ReceiptDialog, type ReceiptData } from "@/features/pos/components/ReceiptDialog"
import { useToast } from "@/hooks/useToast"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface EditableItem {
  id: string
  productId: string
  productName: string
  productCode?: string
  unit?: string
  quantity: number
  sellPrice: number
  discountAmount: number
}

interface ProductResult {
  id: string
  code: string
  name: string
  unit: string
  sellPrice: number
  stock: number
  reservedStock: number
}

interface Transaction {
  id: string
  code: string
  customerId: string | null
  customer: { id: string; name: string } | null
  subtotal: number
  discountAmount: number
  totalAmount: number
  confirmationStatus: string
  transactionDate: string
  items: EditableItem[]
}

interface DepositInfo {
  totalBalance: number
  deposits: { id: string; balance: number; source: string }[]
}

function generateSuggests(total: number): number[] {
  const suggests = new Set<number>()
  suggests.add(total)
  const roundings = [5_000, 10_000, 20_000, 50_000, 100_000]
  for (const r of roundings) {
    const rounded = Math.ceil(total / r) * r
    if (rounded > total) suggests.add(rounded)
    if (suggests.size >= 4) break
  }
  return Array.from(suggests).slice(0, 4)
}

function formatShort(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}jt`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}rb`
  return amount.toLocaleString("id-ID")
}

// ── ProductSearch mini untuk tambah produk ────────────────────────────────────

function AddProductSearch({ onAdd }: { onAdd: (p: ProductResult) => void }) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<ProductResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&isActive=true&limit=8`)
        const json = await res.json()
        setResults(json.data ?? [])
        setActiveIndex(-1)
      } catch { setResults([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement
      el?.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex])

  function select(p: ProductResult) {
    onAdd(p)
    setSearch("")
    setResults([])
    setShowDropdown(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || results.length === 0) return
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
    else if (e.key === "Enter") { e.preventDefault(); if (activeIndex >= 0) select(results[activeIndex]) }
    else if (e.key === "Escape") { setShowDropdown(false); setActiveIndex(-1) }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={search}
          autoComplete="off"
          placeholder="Cari produk untuk ditambahkan..."
          className="pl-8 h-9 text-sm"
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true) }}
          onFocus={() => search && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>
      {showDropdown && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-[200] top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-xl max-h-52 overflow-y-auto"
        >
          {results.map((p, i) => {
            const available = p.stock - (p.reservedStock ?? 0)
            const outOfStock = available <= 0
            return (
              <button
                key={p.id} type="button"
                disabled={outOfStock}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors disabled:opacity-50 ${
                  i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
                onMouseDown={(e) => { e.preventDefault(); if (!outOfStock) select(p) }}
                onMouseEnter={() => !outOfStock && setActiveIndex(i)}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{p.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{p.code} · {p.unit}</span>
                </div>
                <div className="text-right shrink-0">
                  <CurrencyDisplay amount={p.sellPrice} className="text-xs font-semibold" />
                  <p className={`text-[10px] ${outOfStock ? "text-red-500" : "text-muted-foreground"}`}>
                    {outOfStock ? "Habis" : `Stok: ${available}`}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ConfirmTransactionPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = params.id as string

  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false)
  const [editItems, setEditItems] = useState<EditableItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Payment state
  const [paidAmount, setPaidAmount] = useState<number | "">("")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH")
  const [packingFee, setPackingFee] = useState(0)
  const [overpayAction, setOverpayAction] = useState<"return" | "deposit">("return")
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null)
  const [useDepositChecked, setUseDepositChecked] = useState(false)

  // Dialog konfirmasi sebelum submit
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  // Struk setelah konfirmasi berhasil
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)

  const paidInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/transactions/${id}`)
      .then((r) => r.json())
      .then((json) => {
        const trx = json.data
        if (!trx) { router.push("/transactions"); return }
        if (trx.confirmationStatus !== "DRAFT") {
          toast.error("Transaksi ini sudah dikonfirmasi atau dibatalkan")
          router.push("/transactions")
          return
        }
        setTransaction(trx)
        setEditItems(trx.items.map((i: EditableItem) => ({ ...i })))
        setDiscount(Number(trx.discountAmount))
        if (trx.customerId) {
          fetch(`/api/customers/${trx.customerId}/deposit`)
            .then((r) => r.json())
            .then((json) => setDepositInfo(json.data ?? null))
            .catch(() => {})
        }
      })
      .catch(() => router.push("/transactions"))
      .finally(() => setIsLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !transaction) return <LoadingSpinner centered />

  // Kalkulasi real-time
  const subtotal = editItems.reduce(
    (s, i) => s + (i.sellPrice - i.discountAmount) * i.quantity, 0
  )
  const totalAmount = subtotal - discount + packingFee
  const paid = paidAmount === "" ? 0 : paidAmount
  const depositUsed = useDepositChecked && depositInfo
    ? Math.min(depositInfo.totalBalance, Math.max(0, totalAmount - paid))
    : 0
  const effectivePaid = paid + depositUsed
  const debtAmount = Math.max(0, totalAmount - effectivePaid)
  const overpayAmount = Math.max(0, effectivePaid - totalAmount)
  const isFullPay = effectivePaid >= totalAmount && overpayAmount === 0
  const isWalkIn = !transaction.customerId
  const isAllDebt = paidAmount === "" && !isWalkIn
  const suggests = generateSuggests(totalAmount)

  const canConfirm = !isSubmitting && editItems.length > 0 && (
    isAllDebt || (paid > 0 && !(isWalkIn && debtAmount > 0))
  )

  function updateQty(idx: number, qty: number) {
    setEditItems((prev) => prev.map((item, i) =>
      i === idx ? { ...item, quantity: Math.max(1, qty) } : item
    ))
  }

  function removeItem(idx: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function addProduct(p: ProductResult) {
    // Jika produk sudah ada, tambah qty
    const existing = editItems.findIndex((i) => i.productId === p.id)
    if (existing >= 0) {
      setEditItems((prev) => prev.map((item, i) =>
        i === existing ? { ...item, quantity: item.quantity + 1 } : item
      ))
    } else {
      setEditItems((prev) => [...prev, {
        id: `new-${p.id}`,
        productId: p.id,
        productName: p.name,
        productCode: p.code,
        unit: p.unit,
        quantity: 1,
        sellPrice: p.sellPrice,
        discountAmount: 0,
      }])
    }
  }

  async function handleToggleEditMode() {
    if (isEditMode) {
      // Selesai edit → simpan ke server
      setIsSavingEdit(true)
      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: editItems.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              sellPrice: i.sellPrice,
              discountAmount: i.discountAmount,
            })),
            discountAmount: discount,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan perubahan")
        toast.success("Perubahan item berhasil disimpan")
        setIsEditMode(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
      } finally {
        setIsSavingEdit(false)
      }
    } else {
      setIsEditMode(true)
    }
  }

  async function handleConfirm() {
    if (isWalkIn && debtAmount > 0) {
      toast.error("Customer walk-in harus membayar lunas")
      return
    }
    // Buka dialog konfirmasi ringkasan dulu
    setShowConfirmDialog(true)
  }

  async function doConfirm() {
    setShowConfirmDialog(false)
    setIsSubmitting(true)
    try {
      const firstDeposit = depositInfo?.deposits[0]
      const res = await fetch(`/api/transactions/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidAmount: paid,
          paymentMethod,
          packingFee,
          overpayAction,
          depositUsed,
          depositId: useDepositChecked && firstDeposit ? firstDeposit.id : undefined,
          items: editItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            sellPrice: i.sellPrice,
            discountAmount: i.discountAmount,
          })),
          discountAmount: discount,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal konfirmasi")
      toast.success(`Transaksi ${transaction!.code} berhasil dikonfirmasi`)
      // Buka halaman print di tab baru, lalu tampilkan dialog pilihan
      window.open(`/print/receipt/${id}`, "_blank", "noopener,noreferrer")
      setReceiptData(json.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCancel() {
    try {
      const res = await fetch(`/api/transactions/${id}/cancel`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal membatalkan")
      toast.success(`Order ${transaction!.code} dibatalkan`)
      router.push("/transactions")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    }
  }

  return (
    <PageWrapper
      title={`Konfirmasi Order ${transaction.code}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Kembali
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setIsCancelOpen(true)}
          >
            <X className="h-4 w-4 mr-1.5" />
            Batalkan Order
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* ── Kiri: Item order ── */}
        <div className="space-y-4">
          {/* Info order */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{transaction.code}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(transaction.transactionDate), "dd MMM yyyy HH:mm", { locale: idLocale })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="text-sm font-medium">{transaction.customer?.name ?? "Walk-in"}</p>
              </div>
            </div>
          </div>

          {/* Tabel item */}
          <div className="rounded-xl border bg-card overflow-visible">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Item Order</span>
              </div>
              <Button
                variant={isEditMode ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleToggleEditMode}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</>
                ) : isEditMode ? (
                  <><CheckCircle2 className="h-3.5 w-3.5" /> Selesai Edit</>
                ) : (
                  <><Pencil className="h-3.5 w-3.5" /> Edit Item</>
                )}
              </Button>
            </div>

            {/* Header kolom */}
            <div className={`hidden sm:grid gap-2 px-4 py-2 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b ${
              isEditMode ? "grid-cols-[1fr_80px_90px_32px]" : "grid-cols-[1fr_60px_100px_90px]"
            }`}>
              <span>Produk</span>
              <span className="text-center">Qty</span>
              <span className="text-right">{isEditMode ? "Subtotal" : "Harga"}</span>
              {isEditMode ? <span /> : <span className="text-right">Subtotal</span>}
            </div>

            <div className="divide-y">
              {editItems.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">Tidak ada item</p>
                </div>
              ) : (
                editItems.map((item, idx) => {
                  const itemSubtotal = (item.sellPrice - item.discountAmount) * item.quantity
                  return (
                    <div
                      key={item.id}
                      className={`grid gap-2 px-4 py-2.5 items-center text-sm ${
                        isEditMode ? "grid-cols-[1fr_80px_90px_32px]" : "grid-cols-[1fr_60px_100px_90px]"
                      }`}
                    >
                      {/* Nama produk */}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.productName}</p>
                        {item.discountAmount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Disc: <CurrencyDisplay amount={item.discountAmount} className="text-xs" />
                          </p>
                        )}
                      </div>

                      {/* Qty — editable saat edit mode */}
                      {isEditMode ? (
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateQty(idx, parseInt(e.target.value) || 1)}
                          onFocus={(e) => e.target.select()}
                          className="h-8 text-sm text-center px-1"
                        />
                      ) : (
                        <p className="text-center text-muted-foreground">{item.quantity}</p>
                      )}

                      {/* Harga / Subtotal */}
                      {isEditMode ? (
                        <CurrencyDisplay amount={itemSubtotal} className="text-right text-sm font-semibold" />
                      ) : (
                        <CurrencyDisplay amount={item.sellPrice} className="text-right text-sm" />
                      )}

                      {/* Subtotal (read mode) / Hapus (edit mode) */}
                      {isEditMode ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <CurrencyDisplay amount={itemSubtotal} className="text-right text-sm font-semibold" />
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Tambah produk — hanya saat edit mode */}
            {isEditMode && (
              <div className="px-4 py-3 border-t bg-muted/10 space-y-2 overflow-visible">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Produk
                </p>
                <AddProductSearch onAdd={addProduct} />
              </div>
            )}

            {/* Footer subtotal */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <span className="text-sm text-muted-foreground">{editItems.length} produk</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Subtotal:</span>
                <CurrencyDisplay amount={subtotal} className="text-base font-bold" />
              </div>
            </div>
          </div>

          {/* Diskon order — hanya tampil saat edit mode */}
          {isEditMode && (
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <Label className="text-xs">Diskon Order <span className="text-muted-foreground">(opsional)</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={discount || ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Kanan: Panel pembayaran ── */}
        <div className="lg:sticky lg:top-4 rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Konfirmasi Pembayaran</span>
          </div>

          <div className="p-4 space-y-4">
            {/* Ringkasan harga */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal produk</span>
                <CurrencyDisplay amount={subtotal} />
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Diskon</span>
                  <span>−<CurrencyDisplay amount={discount} className="text-sm" /></span>
                </div>
              )}
              {packingFee > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Biaya packing</span>
                  <span>+<CurrencyDisplay amount={packingFee} className="text-sm" /></span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <CurrencyDisplay amount={totalAmount} className="font-bold" />
              </div>
            </div>

            {/* Biaya packing */}
            <div className="space-y-1.5">
              <Label className="text-xs">Biaya Packing <span className="text-muted-foreground">(opsional)</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={packingFee || ""}
                  onChange={(e) => setPackingFee(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <Separator />

            {/* Deposit customer */}
            {depositInfo && depositInfo.totalBalance > 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 px-3 py-2.5">
                <Wallet className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Deposit Tersedia</p>
                  <CurrencyDisplay amount={depositInfo.totalBalance} className="text-sm font-bold text-blue-700 dark:text-blue-400" />
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useDepositChecked}
                    onChange={(e) => setUseDepositChecked(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs">Gunakan</span>
                </label>
              </div>
            )}

            {/* Metode bayar */}
            <div className="space-y-1.5">
              <Label className="text-xs">Metode Pembayaran</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["CASH", "TRANSFER"] as const).map((m) => (
                  <button
                    key={m} type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      paymentMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    {m === "CASH" ? "Tunai" : "Transfer"}
                  </button>
                ))}
              </div>
            </div>

            {/* Nominal bayar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Nominal Bayar</Label>
                {!isWalkIn && <span className="text-xs text-muted-foreground">Kosong = hutang semua</span>}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                <Input
                  ref={paidInputRef}
                  type="number"
                  min={0}
                  placeholder={isWalkIn ? "Wajib diisi" : "0 = hutang semua"}
                  value={paidAmount === "" ? "" : paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="pl-9 h-12 text-xl font-bold"
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {!isWalkIn && (
                  <button
                    type="button"
                    onClick={() => setPaidAmount("")}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      paidAmount === ""
                        ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Hutang
                  </button>
                )}
                {suggests.map((s) => (
                  <button
                    key={s} type="button"
                    onClick={() => setPaidAmount(s)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      paidAmount === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
                    }`}
                  >
                    {s === totalAmount ? (
                      <span className="flex items-center gap-1">
                        <span className="text-[10px] opacity-70">Pas</span>
                        {formatShort(s)}
                      </span>
                    ) : formatShort(s)}
                  </button>
                ))}
              </div>
            </div>

            {/* Status kalkulasi */}
            {(paid > 0 || depositUsed > 0 || isAllDebt) && (
              <div className={`rounded-lg border p-3 space-y-1.5 text-sm ${
                isAllDebt
                  ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50"
                  : overpayAmount > 0
                  ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50"
                  : isFullPay
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50"
                  : "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50"
              }`}>
                {isAllDebt && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-orange-700 dark:text-orange-400 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Semua jadi hutang
                    </span>
                    <CurrencyDisplay amount={totalAmount} className="text-sm font-bold text-orange-700 dark:text-orange-400" />
                  </div>
                )}
                {!isAllDebt && debtAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1.5 font-medium ${isWalkIn ? "text-destructive" : "text-orange-700 dark:text-orange-400"}`}>
                      <AlertCircle className="h-3.5 w-3.5" />
                      {isWalkIn ? "Walk-in harus lunas" : "Hutang"}
                    </span>
                    {!isWalkIn && <CurrencyDisplay amount={debtAmount} className="text-sm font-bold text-orange-700 dark:text-orange-400" />}
                  </div>
                )}
                {!isAllDebt && isFullPay && (
                  <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Lunas
                  </div>
                )}
                {!isAllDebt && overpayAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-medium">
                      <Wallet className="h-3.5 w-3.5" />
                      Kembalian / Deposit
                    </span>
                    <CurrencyDisplay amount={overpayAmount} className="text-sm font-bold text-blue-700 dark:text-blue-400" />
                  </div>
                )}
              </div>
            )}

            {/* Overpay action */}
            {overpayAmount > 0 && transaction.customerId && (
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Kelebihan: <CurrencyDisplay amount={overpayAmount} className="text-xs font-bold text-foreground" />
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverpayAction("return")}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                      overpayAction === "return" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    Kembalikan
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverpayAction("deposit")}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                      overpayAction === "deposit" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    Deposit
                  </button>
                </div>
              </div>
            )}

            <Button
              className="w-full h-11 gap-2 text-base font-semibold"
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              {isSubmitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
                : <><CheckCircle2 className="h-4 w-4" /> Konfirmasi Pembayaran</>
              }
            </Button>

            {isAllDebt && (
              <p className="text-xs text-center text-muted-foreground">
                Seluruh tagihan akan dicatat sebagai hutang customer
              </p>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={isCancelOpen}
        onConfirm={handleCancel}
        onCancel={() => setIsCancelOpen(false)}
        title="Batalkan Order"
        description={`Order ${transaction.code} akan dibatalkan dan stok yang di-reserve akan dilepas. Lanjutkan?`}
        confirmLabel="Ya, Batalkan"
      />

      {/* Dialog konfirmasi ringkasan sebelum submit */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Konfirmasi Transaksi
            </DialogTitle>
            <DialogDescription>
              Periksa kembali ringkasan sebelum dikonfirmasi
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Info order */}
            <div className="rounded-lg bg-muted/50 px-3 py-2.5 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order</span>
                <span className="font-mono font-semibold">{transaction.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">{transaction.customer?.name ?? "Walk-in"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jumlah produk</span>
                <span>{editItems.length} item</span>
              </div>
            </div>

            {/* Ringkasan harga */}
            <div className="rounded-lg border px-3 py-2.5 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <CurrencyDisplay amount={subtotal} />
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Diskon</span>
                  <span>−<CurrencyDisplay amount={discount} className="text-sm" /></span>
                </div>
              )}
              {packingFee > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Biaya packing</span>
                  <span>+<CurrencyDisplay amount={packingFee} className="text-sm" /></span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <CurrencyDisplay amount={totalAmount} className="font-bold" />
              </div>
            </div>

            {/* Ringkasan pembayaran */}
            <div className="rounded-lg border px-3 py-2.5 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metode</span>
                <span>{paymentMethod === "CASH" ? "Tunai" : "Transfer"}</span>
              </div>
              {isAllDebt ? (
                <div className="flex justify-between font-semibold text-orange-600 dark:text-orange-400">
                  <span>Status</span>
                  <span>Hutang semua</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dibayar</span>
                    <CurrencyDisplay amount={paid} />
                  </div>
                  {depositUsed > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Deposit dipakai</span>
                      <CurrencyDisplay amount={depositUsed} className="text-sm" />
                    </div>
                  )}
                  {debtAmount > 0 && (
                    <div className="flex justify-between font-semibold text-orange-600 dark:text-orange-400">
                      <span>Hutang</span>
                      <CurrencyDisplay amount={debtAmount} className="text-sm font-semibold" />
                    </div>
                  )}
                  {overpayAmount > 0 && (
                    <div className="flex justify-between font-semibold text-green-600">
                      <span>{overpayAction === "deposit" ? "Deposit" : "Kembalian"}</span>
                      <CurrencyDisplay amount={overpayAmount} className="text-sm font-semibold" />
                    </div>
                  )}
                  {isFullPay && debtAmount === 0 && overpayAmount === 0 && (
                    <div className="flex justify-between font-semibold text-green-600">
                      <span>Status</span>
                      <span>Lunas</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isSubmitting}
              >
                Periksa Lagi
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={doConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
                  : <><CheckCircle2 className="h-4 w-4" /> Ya, Konfirmasi</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Struk setelah konfirmasi berhasil */}
      <ReceiptDialog
        open={!!receiptData}
        onOpenChange={(open) => {
          if (!open) {
            setReceiptData(null)
            router.push(`/transactions/${id}`)
          }
        }}
        transaction={receiptData}
        onNewTransaction={() => {
          setReceiptData(null)
          router.push("/pos")
        }}
        newTransactionLabel="Order Baru"
      />
    </PageWrapper>
  )
}
