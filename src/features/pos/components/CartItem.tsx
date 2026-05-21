"use client"

import { Minus, Plus, Trash2 } from "lucide-react"
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
    <div className="flex gap-3 px-3 py-3 sm:px-4 hover:bg-muted/30 transition-colors group">
      {/* Info produk */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
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
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            onClick={() => removeItem(item.productId)}
            aria-label="Hapus item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Qty stepper */}
          <div className="flex items-center rounded-md border overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-none border-r hover:bg-muted"
              onClick={() => updateQty(item.productId, item.quantity - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              min={1}
              max={item.stock}
              value={item.quantity}
              onChange={(e) => updateQty(item.productId, Number(e.target.value))}
              className="h-7 w-10 text-center text-sm border-0 rounded-none focus-visible:ring-0 px-0"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-none border-l hover:bg-muted"
              onClick={() => updateQty(item.productId, item.quantity + 1)}
              disabled={item.quantity >= item.stock}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Diskon per item */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Disc:</span>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
              <Input
                type="number"
                min={0}
                value={item.discountAmount || ""}
                onChange={(e) => updateItemDiscount(item.productId, Number(e.target.value))}
                className="h-7 w-20 sm:w-24 text-xs pl-7 pr-1"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Subtotal */}
      <div className="text-right shrink-0 pt-0.5">
        <CurrencyDisplay amount={item.subtotal} className="text-sm font-semibold" />
        {item.discountAmount > 0 && (
          <p className="text-xs text-muted-foreground line-through">
            <CurrencyDisplay amount={item.sellPrice * item.quantity} className="text-xs" />
          </p>
        )}
      </div>
    </div>
  )
}
