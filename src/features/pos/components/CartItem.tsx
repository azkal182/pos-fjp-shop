"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { useCartStore } from "../stores/cart.store"
import type { CartItem as CartItemType } from "../types/pos.types"

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const { updateQty, updateItemDiscount, removeItem } = useCartStore()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_90px_140px_120px] gap-2 px-3 py-3 sm:px-4 hover:bg-muted/30 transition-colors items-center">
      <div className="min-w-0 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight truncate">{item.productName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-mono">{item.productCode}</span>
            <span className="mx-1">·</span>
            <CurrencyDisplay amount={item.sellPrice} className="text-xs" />
            <span className="mx-1">/</span>
            <span>{item.unit}</span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive sm:hidden"
          onClick={() => removeItem(item.productId)}
          aria-label="Hapus item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Input
        type="number"
        min={1}
        max={item.stock}
        value={item.quantity}
        onChange={(e) => updateQty(item.productId, Number(e.target.value))}
        className="h-8 text-sm text-center"
      />

      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
        <Input
          type="number"
          min={0}
          value={item.discountAmount || ""}
          onChange={(e) => updateItemDiscount(item.productId, Number(e.target.value))}
          className="h-8 text-sm pl-7"
          placeholder="0"
        />
      </div>

      <div className="text-right shrink-0 pt-0.5 flex items-center justify-end gap-1.5">
        <div>
          <CurrencyDisplay amount={item.subtotal} className="text-sm font-semibold" />
          {item.discountAmount > 0 && (
            <p className="text-xs text-muted-foreground line-through">
              <CurrencyDisplay amount={item.sellPrice * item.quantity} className="text-xs" />
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => removeItem(item.productId)}
          aria-label="Hapus item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
