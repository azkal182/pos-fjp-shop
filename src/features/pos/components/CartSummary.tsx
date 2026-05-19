"use client"

import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { useCartStore } from "../stores/cart.store"

export function CartSummary() {
  const { discountAmount, setDiscount, subtotal, totalAmount, items } = useCartStore()
  const sub = subtotal()
  const total = totalAmount()
  const isEmpty = items.length === 0

  if (isEmpty) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        Tambahkan produk untuk melihat ringkasan
      </p>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <CurrencyDisplay amount={sub} className="text-sm" />
      </div>

      {/* Diskon total */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground shrink-0">Diskon</span>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
          <Input
            type="number"
            min={0}
            value={discountAmount || ""}
            onChange={(e) => setDiscount(Number(e.target.value))}
            className="h-8 w-36 text-right text-sm pl-8"
            placeholder="0"
          />
        </div>
      </div>

      <Separator />

      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold">Total</span>
        <CurrencyDisplay amount={total} className="text-lg font-bold" />
      </div>
    </div>
  )
}
