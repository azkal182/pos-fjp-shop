"use client"

import { useEffect, useRef, useState } from "react"
import { Trash2, Package } from "lucide-react"
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
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const qty = watch(`items.${index}.quantity`) ?? 1
  const buyPrice = watch(`items.${index}.buyPrice`) ?? 0
  const subtotal = (Number(qty) || 0) * (Number(buyPrice) || 0)
  const itemErrors = (errors.items as any)?.[index]

  useEffect(() => {
    if (!search.trim()) { setProducts([]); setActiveIndex(-1); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&isActive=true&limit=8`)
        const json = await res.json()
        setProducts(json.data ?? [])
        setActiveIndex(-1)
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
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || products.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, products.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeIndex >= 0 && products[activeIndex]) {
        selectProduct(products[activeIndex])
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false)
      setActiveIndex(-1)
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement
      item?.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex])

  return (
    <div className="grid grid-cols-[1fr_72px_130px_90px_36px] gap-2 items-start">
      {/* Produk search */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true) }}
          onFocus={() => search && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Cari produk..."
          className="text-sm"
          aria-invalid={!!itemErrors?.productId}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          role="combobox"
        />
        {showDropdown && products.length > 0 && (
          <div
            ref={listRef}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-52 overflow-y-auto"
            role="listbox"
          >
            {products.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
                onMouseDown={() => selectProduct(p)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{p.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{p.code} · {p.unit}</span>
                </div>
                <CurrencyDisplay amount={p.buyPrice} className="text-xs shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
        <input type="hidden" {...register(`items.${index}.productId`)} />
        {itemErrors?.productId && (
          <p className="text-xs text-destructive mt-1">{itemErrors.productId.message}</p>
        )}
        {selectedProduct && (
          <p className="text-xs text-muted-foreground mt-1">
            HPP: <CurrencyDisplay amount={selectedProduct.buyPrice} className="text-xs" />
            {" · "}{selectedProduct.unit}
          </p>
        )}
      </div>

      {/* Qty */}
      <div>
        <Input
          type="number"
          min={1}
          placeholder="1"
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
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
          <Input
            type="number"
            min={0}
            placeholder="0"
            className="text-sm pl-7"
            {...register(`items.${index}.buyPrice`, { valueAsNumber: true })}
            aria-invalid={!!itemErrors?.buyPrice}
          />
        </div>
        {itemErrors?.buyPrice && (
          <p className="text-xs text-destructive mt-1">{itemErrors.buyPrice.message}</p>
        )}
      </div>

      {/* Subtotal */}
      <div className="flex items-center justify-end h-9">
        <CurrencyDisplay amount={subtotal} className="text-sm font-semibold" />
      </div>

      {/* Hapus */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        aria-label="Hapus item"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
