"use client"

import { useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
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
  const inputRef = useRef<HTMLInputElement>(null)
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&isActive=true&limit=10`)
        const json = await res.json()
        setResults(json.data ?? [])
      } catch { setResults([]) }
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

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
    inputRef.current?.focus()
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
        placeholder="Cari produk (nama atau kode)..."
        className="pl-9 text-sm h-11"
        autoFocus
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-72 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={p.stock === 0}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-3 border-b last:border-0"
              onMouseDown={() => handleSelect(p)}
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{p.code} · {p.unit}</p>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                <CurrencyDisplay amount={Number(p.sellPrice)} className="text-sm font-semibold" />
                <div>
                  <StockBadge stock={p.stock} minStock={p.minStock} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
