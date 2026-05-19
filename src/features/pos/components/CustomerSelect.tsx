"use client"

import { useEffect, useState } from "react"
import { X, AlertCircle } from "lucide-react"
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
  const { customerId, customerName, customerHasDebt, customerOutstandingDebt, setCustomer, clearCustomer } = useCartStore()
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<Customer[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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
    // Fetch debt summary
    let hasDebt = false
    let outstanding = 0
    try {
      const res = await fetch(`/api/customers/${customer.id}/debts`)
      const json = await res.json()
      outstanding = json.data?.totalOutstanding ?? 0
      hasDebt = outstanding > 0
    } catch {}

    setCustomer(customer.id, customer.name, hasDebt, outstanding)
    setSearch(customer.name)
    setShowDropdown(false)
  }

  function handleClear() {
    clearCustomer()
    setSearch("")
    setResults([])
  }

  if (customerId) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
          <div>
            <p className="text-sm font-medium">{customerName}</p>
            <p className="text-xs text-muted-foreground">Customer terdaftar</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {customerHasDebt && (
          <div className="flex items-center gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 dark:bg-yellow-950/20 dark:border-yellow-900/50">
            <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
            <div className="text-xs">
              <span className="text-yellow-700 dark:text-yellow-400">Hutang outstanding: </span>
              <CurrencyDisplay amount={customerOutstandingDebt} className="text-xs font-semibold text-yellow-700 dark:text-yellow-400" />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowDropdown(true) }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="Cari customer atau biarkan untuk walk-in..."
          className="text-sm"
        />
        {showDropdown && (search.trim() || results.length > 0) && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-52 overflow-y-auto">
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b"
              onMouseDown={handleClear}
            >
              <span className="font-medium">Walk-in (Tunai)</span>
              <span className="text-xs text-muted-foreground ml-2">Bayar lunas, tanpa hutang</span>
            </button>
            {isLoading && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Mencari...</div>
            )}
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2"
                onMouseDown={() => handleSelect(c)}
              >
                <div>
                  <span className="font-medium">{c.name}</span>
                  {c.phone && <span className="text-xs text-muted-foreground ml-2">{c.phone}</span>}
                </div>
                {c.totalOutstanding > 0 && (
                  <span className="text-xs text-red-600 shrink-0">
                    Hutang: <CurrencyDisplay amount={c.totalOutstanding} className="text-xs" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Kosongkan untuk transaksi walk-in</p>
    </div>
  )
}
