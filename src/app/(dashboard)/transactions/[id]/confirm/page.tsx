"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Loader2, CreditCard, Package, Wallet,
  AlertCircle, CheckCircle2, X, Banknote, Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useToast } from "@/hooks/useToast"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface EditableItem {
  id: string
  productId: string
  productName: string
  quantity: number
  sellPrice: number
  discountAmount: number
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

export default function ConfirmTransactionPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const id = params.id as string

  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)

  // Editable items state — diinisialisasi dari transaksi
  const [editItems, setEditItems] = useState<EditableItem[]>([])
  const [discount, setDiscount] = useState(0)

  // Payment state
  const [paidAmount, setPaidAmount] = useState<number | "">("")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH")
  const [packingFee, setPackingFee] = useState(0)
  const [overpayAction, setOverpayAction] = useState<"return" | "deposit">("return")
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null)
  const [useDepositChecked, setUseDepositChecked] = useState(false)

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

  // Kalkulasi real-time dari editItems
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
  // Hutang semua = nominal kosong + ada customer
  const isAllDebt = paidAmount === "" && !isWalkIn

  const suggests = generateSuggests(totalAmount)

  // Tombol konfirmasi bisa diklik jika:
  // - Ada customer + nominal kosong (hutang semua) ATAU
  // - Nominal > 0 (bayar sebagian/lunas)
  // - Walk-in harus bayar lunas
  const canConfirm = !isSubmitting && editItems.length > 0 && (
    isAllDebt || (paid > 0 && !(isWalkIn && debtAmount > 0))
  )

  function updateItem(idx: number, field: keyof EditableItem, value: number) {
    setEditItems((prev) => prev.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    ))
  }

  function removeItem(idx: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleConfirm() {
    if (isWalkIn && debtAmount > 0) {
      toast.error("Customer walk-in harus membayar lunas")
      return
    }
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
          // Kirim items yang sudah diedit
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
      router.push(`/transactions/${id}`)
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
        {/* ── Kiri: Item order (editable) ── */}
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

          {/* Tabel item — editable */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Item Order</span>
              <span className="text-xs text-muted-foreground ml-auto">Qty dan harga bisa diubah</span>
            </div>

            {/* Header kolom */}
            <div className="hidden sm:grid grid-cols-[1fr_80px_120px_90px_32px] gap-2 px-4 py-2 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b">
              <span>Produk</span>
              <span className="text-center">Qty</span>
              <span>Harga Jual</span>
              <span className="text-right">Subtotal</span>
              <span />
            </div>

            <div className="divide-y">
              {editItems.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">Semua item dihapus</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Tambahkan item atau batalkan order</p>
                </div>
              ) : (
                editItems.map((item, idx) => {
                  const itemSubtotal = (item.sellPrice - item.discountAmount) * item.quantity
                  return (
                    <div key={item.id} className="grid grid-cols-[1fr_80px_120px_90px_32px] gap-2 px-4 py-2.5 items-center">
                      {/* Nama produk */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.productName}</p>
                        {item.discountAmount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Disc: <CurrencyDisplay amount={item.discountAmount} className="text-xs" />
                          </p>
                        )}
                      </div>

                      {/* Qty editable */}
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                        onFocus={(e) => e.target.select()}
                        className="h-8 text-sm text-center px-1"
                      />

                      {/* Harga jual editable */}
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">Rp</span>
                        <Input
                          type="number"
                          min={0}
                          value={item.sellPrice}
                          onChange={(e) => updateItem(idx, "sellPrice", parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          className="h-8 text-sm pl-6"
                        />
                      </div>

                      {/* Subtotal */}
                      <CurrencyDisplay amount={itemSubtotal} className="text-right text-sm font-semibold" />

                      {/* Hapus */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(idx)}
                        disabled={editItems.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer subtotal */}
            {editItems.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                <span className="text-sm text-muted-foreground">{editItems.length} produk</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Subtotal:</span>
                  <CurrencyDisplay amount={subtotal} className="text-base font-bold" />
                </div>
              </div>
            )}
          </div>

          {/* Diskon order */}
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
                {!isWalkIn && (
                  <span className="text-xs text-muted-foreground">Kosong = hutang semua</span>
                )}
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

              {/* Quick fill */}
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

            {/* Tombol konfirmasi */}
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
    </PageWrapper>
  )
}
