"use client"

import { useEffect, useRef, useState } from "react"
import { X, AlertCircle, User, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { useCartStore } from "../stores/cart.store"

interface Customer {
  id: string
  name: string
  phone: string | null
  totalOutstanding: number
}

export function CustomerSelect() {
  const {
    customerId, customerName, customerHasDebt, customerOutstandingDebt,
    setCustomer, clearCustomer,
  } = useCartStore()

  const [search, setSearch] = useState("")
  const [results, setResults] = useState<Customer[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}&isActive=true&limit=8`)
        const json = await res.json()
        setResults(json.data ?? [])
      } catch { setResults([]) }
      finally { setIsLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  async function handleSelect(customer: Customer) {
    let hasDebt = false
    let outstanding = 0
    try {
      const res = await fetch(`/api/customers/${customer.id}/debts`)
      const json = await res.json()
      outstanding = json.data?.totalOutstanding ?? 0
      hasDebt = outstanding > 0
    } catch {}
    setCustomer(customer.id, customer.name, hasDebt, outstanding)
    setSearch("")
    setShowDropdown(false)
  }

  function handleClear() {
    clearCustomer()
    setSearch("")
    setResults([])
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // Customer sudah dipilih
  if (customerId) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{customerName}</p>
            <p className="text-xs text-muted-foreground">Customer terdaftar</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleClear}
            aria-label="Ganti customer"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {customerHasDebt && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 dark:bg-amber-950/20 dark:border-amber-900/50">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p className="font-semibold text-amber-700 dark:text-amber-400">Ada hutang outstanding</p>
              <CurrencyDisplay
                amount={customerOutstandingDebt}
                className="text-xs font-bold text-amber-700 dark:text-amber-400"
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  // Mode search
  return (
    // overflow-visible penting agar dropdown tidak terpotong oleh parent
    <div className="relative" style={{ isolation: "auto" }}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true) }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="Cari customer..."
          className="pl-8 text-sm h-9"
        />
      </div>

      {/* Dropdown — fixed positioning agar tidak terpotong card */}
      {showDropdown && (
        <div className="absolute left-0 right-0 mt-1 bg-background border rounded-lg shadow-xl overflow-hidden"
          style={{ zIndex: 9999, top: "100%" }}
        >
          {/* Walk-in option */}
          <button
            type="button"
            className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors border-b flex items-center gap-2"
            onMouseDown={(e) => { e.preventDefault(); handleClear() }}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted shrink-0">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <span className="font-medium">Walk-in</span>
              <span className="text-xs text-muted-foreground ml-2">Bayar lunas · tanpa hutang</span>
            </div>
          </button>

          {isLoading && (
            <div className="px-3 py-2.5 text-xs text-muted-foreground">Mencari...</div>
          )}

          {!isLoading && search.trim() && results.length === 0 && (
            <div className="px-3 py-2.5 text-xs text-muted-foreground">Tidak ada customer ditemukan</div>
          )}

          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 border-b last:border-0"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(c) }}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
              </div>
              {c.totalOutstanding > 0 && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-amber-600 font-medium">Hutang</p>
                  <CurrencyDisplay amount={c.totalOutstanding} className="text-xs text-amber-600" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-1.5">
        Kosongkan untuk transaksi walk-in
      </p>
    </div>
  )
}
