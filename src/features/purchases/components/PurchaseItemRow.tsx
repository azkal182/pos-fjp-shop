"use client"

import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { useFormContext } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import type { CreatePurchaseInput } from "../schemas/purchase.schema"

interface Product {
  id: string
  name: string
  code: string
  unit: string
  buyPrice: number
}

interface PurchaseItemRowProps {
  index: number
  onRemove: () => void
}

export function PurchaseItemRow({ index, onRemove }: PurchaseItemRowProps) {
  const { register, watch, setValue, formState: { errors } } = useFormContext<CreatePurchaseInput>()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const qty = watch(`items.${index}.quantity`) ?? 1
  const buyPrice = watch(`items.${index}.buyPrice`) ?? 0
  const subtotal = (Number(qty) || 0) * (Number(buyPrice) || 0)

  const itemErrors = (errors.items as any)?.[index]

  useEffect(() => {
    if (!search.trim()) { setProducts([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&isActive=true&limit=10`)
        const json = await res.json()
        setProducts(json.data ?? [])
      } catch { setProducts([]) }
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  function selectProduct(product: Product) {
    setSelectedProduct(product)
    setValue(`items.${index}.productId`, product.id)
    setValue(`items.${index}.buyPrice`, product.buyPrice)
    setSearch(product.name)
    setShowDropdown(false)
  }

  return (
    <div className="grid grid-cols-[1fr_80px_140px_100px_36px] gap-2 items-start">
      {/* Produk search */}
      <div className="relative">
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true) }}
          onFocus={() => search && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="Cari produk..."
          className="text-sm"
          aria-invalid={!!itemErrors?.productId}
        />
        {showDropdown && products.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2"
                onMouseDown={() => selectProduct(p)}
              >
                <div>
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">{p.code}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{p.unit}</span>
              </button>
            ))}
          </div>
        )}
        {/* Hidden input untuk productId */}
        <input type="hidden" {...register(`items.${index}.productId`)} />
        {itemErrors?.productId && (
          <p className="text-xs text-destructive mt-1">{itemErrors.productId.message}</p>
        )}
        {selectedProduct && (
          <p className="text-xs text-muted-foreground mt-1">
            HPP saat ini: <CurrencyDisplay amount={selectedProduct.buyPrice} className="text-xs" />
          </p>
        )}
      </div>

      {/* Qty */}
      <div>
        <Input
          type="number"
          min={1}
          placeholder="Qty"
          className="text-sm text-center"
          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
          aria-invalid={!!itemErrors?.quantity}
        />
        {itemErrors?.quantity && (
          <p className="text-xs text-destructive mt-1">{itemErrors.quantity.message}</p>
        )}
      </div>

      {/* Harga Beli */}
      <div>
        <Input
          type="number"
          min={0}
          placeholder="Harga beli"
          className="text-sm"
          {...register(`items.${index}.buyPrice`, { valueAsNumber: true })}
          aria-invalid={!!itemErrors?.buyPrice}
        />
        {itemErrors?.buyPrice && (
          <p className="text-xs text-destructive mt-1">{itemErrors.buyPrice.message}</p>
        )}
      </div>

      {/* Subtotal */}
      <div className="flex items-center justify-end h-9">
        <CurrencyDisplay amount={subtotal} className="text-sm font-medium" />
      </div>

      {/* Hapus */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-destructive hover:text-destructive"
        onClick={onRemove}
        aria-label="Hapus item"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
