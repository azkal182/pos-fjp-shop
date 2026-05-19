"use client"

import { useEffect, useRef, useState } from "react"
import { Search, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { StockBadge } from "@/features/products/components/StockBadge"
import { useCartStore } from "../stores/cart.store"

interface Product {
  id: string
  code: string
  name: string
  unit: string
  sellPrice: number
  buyPrice: number
  stock: number
  minStock: number
}

export function ProductSearch() {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<Product[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    if (!search.trim()) { setResults([]); setIsLoading(false); setActiveIndex(-1); return }
    setIsLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&isActive=true&limit=10`)
        const json = await res.json()
        setResults(json.data ?? [])
        setActiveIndex(-1)
      } catch { setResults([]) }
      finally { setIsLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement
      item?.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex])

  function handleSelect(product: Product) {
    if (product.stock === 0) return
    addItem({
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      unit: product.unit,
      sellPrice: Number(product.sellPrice),
      buyPrice: Number(product.buyPrice),
      stock: product.stock,
    })
    setSearch("")
    setResults([])
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || results.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeIndex >= 0 && results[activeIndex]) handleSelect(results[activeIndex])
    } else if (e.key === "Escape") {
      setShowDropdown(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        value={search}
        onChange={(e) => { setSearch(e.target.value); setShowDropdown(true) }}
        onFocus={() => search && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="Cari produk (nama atau kode SKU)..."
        className="pl-9 h-10 text-sm bg-background"
        autoFocus
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
      />
      {search && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {isLoading ? "Mencari..." : results.length > 0 ? `${results.length} hasil` : ""}
        </div>
      )}

      {showDropdown && search.trim() && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 mt-1 bg-background border rounded-lg shadow-xl overflow-hidden"
          style={{ zIndex: 9999, top: "100%" }}
          role="listbox"
        >
          {isLoading && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Mencari produk...</div>
          )}
          {!isLoading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Produk tidak ditemukan untuk "<span className="font-medium">{search}</span>"
            </div>
          )}
          {results.map((p, i) => {
            const outOfStock = p.stock === 0
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                disabled={outOfStock}
                className={`w-full text-left px-4 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 border-b last:border-0 transition-colors ${
                  i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
                onMouseDown={() => handleSelect(p)}
                onMouseEnter={() => !outOfStock && setActiveIndex(i)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{p.code}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <CurrencyDisplay amount={Number(p.sellPrice)} className="text-sm font-semibold block" />
                  <StockBadge stock={p.stock} minStock={p.minStock} />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
