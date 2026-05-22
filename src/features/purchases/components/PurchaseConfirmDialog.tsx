"use client"

/**
 * PurchaseConfirmDialog
 * Dialog konfirmasi sebelum simpan pembelian.
 * Upload foto nota vendor WAJIB sebelum bisa simpan.
 */

import { useState } from "react"
import { CheckCircle2, AlertCircle, Loader2, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { ImageUpload } from "@/components/shared/ImageUpload"

interface CartItem {
  uid: string
  productName: string
  productCode: string
  unit: string
  quantity: number
  buyPrice: number
}

interface PurchaseConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendorName: string
  purchaseDate: string
  cart: CartItem[]
  cartTotal: number
  paidAmount: number | undefined
  paymentMethod: string
  isSubmitting: boolean
  onConfirm: (receiptImageUrl: string) => void
}

export function PurchaseConfirmDialog({
  open,
  onOpenChange,
  vendorName,
  purchaseDate,
  cart,
  cartTotal,
  paidAmount,
  paymentMethod,
  isSubmitting,
  onConfirm,
}: PurchaseConfirmDialogProps) {
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null)
  const [showError, setShowError] = useState(false)

  const paid = paidAmount ?? 0
  const debtAmount = Math.max(0, cartTotal - paid)
  const overpay = Math.max(0, paid - cartTotal)
  const isFullPaid = paid >= cartTotal && overpay === 0
  const isDebt = paid < cartTotal
  const paymentLabel = paymentMethod === "CASH" ? "Tunai" : "Transfer"

  function handleConfirm() {
    if (!receiptImageUrl) {
      setShowError(true)
      return
    }
    setShowError(false)
    onConfirm(receiptImageUrl)
  }

  function handleClose() {
    if (!isSubmitting) {
      setReceiptImageUrl(null)
      setShowError(false)
      onOpenChange(false)
    }
  }

  function handleImageChange(url: string | null) {
    setReceiptImageUrl(url)
    if (url) setShowError(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDebt ? (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            Konfirmasi Pembelian
          </DialogTitle>
          <DialogDescription>
            Periksa kembali dan upload foto nota vendor sebelum menyimpan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info vendor & tanggal */}
          <div className="rounded-lg bg-muted/40 border p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendor</span>
              <span className="font-semibold">{vendorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tanggal</span>
              <span>{purchaseDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jumlah Item</span>
              <span>{cart.length} jenis produk</span>
            </div>
          </div>

          {/* Daftar item */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Item Pembelian
            </p>
            <div className="rounded-lg border divide-y max-h-40 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.uid} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} {item.unit} × <CurrencyDisplay amount={item.buyPrice} className="text-xs" />
                    </p>
                  </div>
                  <CurrencyDisplay
                    amount={item.quantity * item.buyPrice}
                    className="text-sm font-semibold shrink-0 ml-2"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Summary pembayaran */}
          <div className="rounded-lg border p-3 space-y-2 text-sm">
            <div className="flex justify-between font-bold text-base">
              <span>Total Pembelian</span>
              <CurrencyDisplay amount={cartTotal} className="font-bold" />
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bayar ({paymentLabel})</span>
              <CurrencyDisplay amount={paid} />
            </div>
            {debtAmount > 0 && (
              <div className="flex justify-between font-semibold text-orange-600">
                <span>Hutang ke Vendor</span>
                <CurrencyDisplay amount={debtAmount} className="font-semibold text-orange-600" />
              </div>
            )}
            {overpay > 0 && (
              <div className="flex justify-between font-semibold text-blue-600">
                <span>Kelebihan → Deposit</span>
                <CurrencyDisplay amount={overpay} className="font-semibold text-blue-600" />
              </div>
            )}
          </div>

          {/* Status badge */}
          <div className={`rounded-lg p-3 text-sm font-medium flex items-center gap-2 ${
            isFullPaid
              ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400"
              : overpay > 0
              ? "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400"
              : "bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-400"
          }`}>
            {isFullPaid ? (
              <><CheckCircle2 className="h-4 w-4 shrink-0" /> Pembelian akan dicatat sebagai LUNAS</>
            ) : overpay > 0 ? (
              <><CheckCircle2 className="h-4 w-4 shrink-0" /> Kelebihan Rp {overpay.toLocaleString("id-ID")} otomatis jadi deposit vendor</>
            ) : (
              <><AlertCircle className="h-4 w-4 shrink-0" /> Hutang Rp {debtAmount.toLocaleString("id-ID")} akan dicatat ke buku hutang vendor</>
            )}
          </div>

          <Separator />

          {/* Upload nota — WAJIB */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ImageIcon className={`h-4 w-4 ${showError ? "text-destructive" : "text-muted-foreground"}`} />
              <p className={`text-sm font-medium ${showError ? "text-destructive" : ""}`}>
                Foto Nota Vendor
              </p>
              <span className="text-xs font-semibold text-destructive">* wajib</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload foto nota/invoice dari vendor sebagai bukti pembelian.
            </p>

            <div className={showError ? "rounded-lg ring-2 ring-destructive ring-offset-1" : ""}>
              <ImageUpload
                value={receiptImageUrl}
                onChange={handleImageChange}
                folder="purchase-receipts"
                label=""
                hint="JPG, PNG, WebP. Maks 5 MB."
              />
            </div>

            {showError && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Foto nota wajib diupload sebelum menyimpan pembelian
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Periksa Lagi
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Ya, Simpan</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
