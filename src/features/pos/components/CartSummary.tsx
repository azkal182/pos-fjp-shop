"use client"

import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { useCartStore } from "../stores/cart.store"

export function CartSummary() {
  const { discountAmount, setDiscount, subtotal, totalAmount } = useCartStore()
  const sub = subtotal()
  const total = totalAmount()

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <CurrencyDisplay amount={sub} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground shrink-0">Diskon</span>
        <Input
          type="number"
          min={0}
          value={discountAmount}
          onChange={(e) => setDiscount(Number(e.target.value))}
          className="h-7 w-32 text-right text-sm"
          placeholder="0"
        />
      </div>

      <Separator />

      <div className="flex justify-between font-semibold text-base">
        <span>Total</span>
        <CurrencyDisplay amount={total} className="text-base font-bold" />
      </div>
    </div>
  )
}
