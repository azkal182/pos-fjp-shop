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
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      {/* Info produk */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.productName}</p>
        <p className="text-xs text-muted-foreground font-mono">{item.productCode} · {item.unit}</p>
        <div className="flex items-center gap-3 mt-1.5">
          {/* Qty */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 text-xs"
              onClick={() => updateQty(item.productId, item.quantity - 1)}
            >
              −
            </Button>
            <Input
              type="number"
              min={1}
              max={item.stock}
              value={item.quantity}
              onChange={(e) => updateQty(item.productId, Number(e.target.value))}
              className="h-6 w-12 text-center text-xs px-1"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 text-xs"
              onClick={() => updateQty(item.productId, item.quantity + 1)}
              disabled={item.quantity >= item.stock}
            >
              +
            </Button>
          </div>
          {/* Diskon per item */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Diskon:</span>
            <Input
              type="number"
              min={0}
              value={item.discountAmount}
              onChange={(e) => updateItemDiscount(item.productId, Number(e.target.value))}
              className="h-6 w-20 text-xs px-1"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Subtotal + hapus */}
      <div className="text-right shrink-0">
        <CurrencyDisplay amount={item.subtotal} className="text-sm font-semibold" />
        <p className="text-xs text-muted-foreground">
          <CurrencyDisplay amount={item.sellPrice} className="text-xs" /> × {item.quantity}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 mt-1 text-destructive hover:text-destructive"
          onClick={() => removeItem(item.productId)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
