"use client"

import { useEffect, useState, useRef } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Plus, Loader2, PackagePlus, Truck, CalendarDays, FileText,
  Wallet, Banknote, AlertCircle, CheckCircle2, ShoppingBag, Trash2, Package, Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { PriceChangeAlert } from "./PriceChangeAlert"
import { PurchaseConfirmDialog } from "./PurchaseConfirmDialog"
import { createPurchaseSchema, type CreatePurchaseInput, type PriceChange } from "../schemas/purchase.schema"
import { useToast } from "@/hooks/useToast"
import type { Control } from "react-hook-form"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Vendor { id: string; name: string }

interface Product {
  id: string; name: string; code: string; unit: string; buyPrice: number
}

interface CartItem {
  uid: string
  productId: string; productName: string; productCode: string; unit: string
  quantity: number; buyPrice: number; catalogPrice: number | null
}

interface PurchaseFormProps {
  onSuccess: () => void
  defaultVendorId?: string
}



// ── ProductSearch ─────────────────────────────────────────────────────────────

interface ProductSearchProps {
  vendorId?: string
  value: Product | null
  onChange: (p: Product | null) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
}

function ProductSearch({ vendorId, value, onChange, inputRef }: ProductSearchProps) {
  const [search, setSearch] = useState(value?.name ?? "")
  const [products, setProducts] = useState<Product[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  useEffect(() => { setSearch(value?.name ?? "") }, [value])

  useEffect(() => {
    if (!search.trim()) { setProducts([]); setActiveIndex(-1); return }
    const t = setTimeout(async () => {
      try {
        const p = new URLSearchParams({ search, isActive: "true", limit: "8" })
        if (vendorId) p.set("vendorId", vendorId)
        const res = await fetch("/api/products?" + p)
        const json = await res.json()
        setProducts(json.data ?? [])
        setActiveIndex(-1)
      } catch { setProducts([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [search, vendorId])

  // Hitung posisi dropdown berdasarkan posisi input — pakai fixed positioning
  // agar tidak terpotong oleh overflow:hidden di ancestor manapun
  useEffect(() => {
    if (!showDropdown || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    })
  }, [showDropdown, search])

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement
      el?.scrollIntoView({ block: "nearest" })
    }
  }, [activeIndex])

  function select(p: Product) {
    setSearch(p.name)
    setShowDropdown(false)
    setActiveIndex(-1)
    onChange(p)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || products.length === 0) return
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, products.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
    else if (e.key === "Enter") { e.preventDefault(); if (activeIndex >= 0) select(products[activeIndex]) }
    else if (e.key === "Escape") { setShowDropdown(false); setActiveIndex(-1) }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={search}
        autoComplete="off"
        placeholder="Cari produk..."
        className="h-9 text-sm"
        onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); if (!e.target.value) onChange(null) }}
        onFocus={() => search && setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        onKeyDown={handleKeyDown}
      />
      {showDropdown && products.length > 0 && (
        <div
          ref={listRef}
          style={dropdownStyle}
          className="bg-background border rounded-lg shadow-xl max-h-52 overflow-y-auto"
        >
          {products.map((p, i) => (
            <button
              key={p.id} type="button"
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              }`}
              onMouseDown={(e) => { e.preventDefault(); select(p) }}
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
    </div>
  )
}

// ── AddItemBar ────────────────────────────────────────────────────────────────

interface AddItemBarProps {
  vendorId?: string
  onAdd: (item: Omit<CartItem, "uid">) => void
}

function AddItemBar({ vendorId, onAdd }: AddItemBarProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [qty, setQty] = useState("1")
  const [price, setPrice] = useState("")
  const [catalogPrice, setCatalogPrice] = useState<number | null>(null)
  const [isFetchingPrice, setIsFetchingPrice] = useState(false)

  // Refs untuk focus management
  const searchRef = useRef<HTMLInputElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)
  const priceRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!product) { setPrice(""); setCatalogPrice(null); return }
    setPrice(String(product.buyPrice))
    setCatalogPrice(null)
    if (!vendorId) {
      // Fokus ke qty dan select all
      setTimeout(() => { qtyRef.current?.focus(); qtyRef.current?.select() }, 50)
      return
    }
    setIsFetchingPrice(true)
    fetch("/api/products/" + product.id + "/vendor-prices/" + vendorId)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const cp = Number(json.data.buyPrice)
          setCatalogPrice(cp)
          setPrice(String(cp))
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsFetchingPrice(false)
        setTimeout(() => { qtyRef.current?.focus(); qtyRef.current?.select() }, 50)
      })
  }, [product, vendorId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAdd() {
    if (!product) return
    const q = Math.max(1, parseInt(qty) || 1)
    const p = Math.max(0, parseFloat(price) || 0)
    onAdd({
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      unit: product.unit,
      quantity: q,
      buyPrice: p,
      catalogPrice,
    })
    setProduct(null)
    setQty("1")
    setPrice("")
    setCatalogPrice(null)
    // Autofocus kembali ke search setelah tambah
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd() }
  }

  const canAdd = !!product && (parseInt(qty) || 0) > 0
  const isPriceFromCatalog = catalogPrice !== null && parseFloat(price) === catalogPrice
  const isPriceManual = catalogPrice !== null && parseFloat(price) !== catalogPrice

  return (
    // overflow-hidden aman karena dropdown pakai position:fixed
    <div className="px-4 py-3 border-b bg-muted/10 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_80px_140px_auto] gap-2 items-end">
        {/* Produk */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Produk</Label>
          <ProductSearch vendorId={vendorId} value={product} onChange={setProduct} inputRef={searchRef} />
        </div>

        {/* Qty */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Qty</Label>
          <Input
            ref={qtyRef}
            type="number" min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={handleKeyDown}
            className="h-9 text-sm text-center"
            placeholder="1"
          />
        </div>

        {/* Harga Beli */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Harga Beli{isFetchingPrice && <span className="ml-1 opacity-50 text-[10px]">loading...</span>}
          </Label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">Rp</span>
            <Input
              ref={priceRef}
              type="number" min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={handleKeyDown}
              className={`h-9 text-sm pl-7 ${isPriceFromCatalog ? "border-green-400 dark:border-green-600" : ""}`}
              placeholder="0"
            />
          </div>
        </div>

        {/* Tombol Tambah */}
        <Button type="button" onClick={handleAdd} disabled={!canAdd} className="h-9 gap-1.5">
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>

      {/* Hint harga */}
      {product && (
        <div className="flex items-center gap-1.5 text-xs">
          {isPriceFromCatalog && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Tag className="h-3 w-3" />
              Harga dari catalog vendor
            </span>
          )}
          {isPriceManual && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3 w-3" />
              Harga manual (catalog: <CurrencyDisplay amount={catalogPrice!} className="text-xs" />)
            </span>
          )}
          {catalogPrice === null && !isFetchingPrice && (
            <span className="text-muted-foreground">
              HPP terakhir: <CurrencyDisplay amount={product.buyPrice} className="text-xs" />
              {" · "}{product.unit}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── CartTable ─────────────────────────────────────────────────────────────────

interface CartTableProps {
  cart: CartItem[]
  onUpdate: (uid: string, field: "quantity" | "buyPrice", value: number) => void
  onRemove: (uid: string) => void
}

function CartTable({ cart, onUpdate, onRemove }: CartTableProps) {
  if (cart.length === 0) {
    return (
      <div className="px-4 py-14 text-center">
        <ShoppingBag className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Belum ada item</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Cari produk di atas lalu klik Tambah</p>
      </div>
    )
  }

  return (
    <>
      {/* Header kolom — hanya tampil di sm+ */}
      <div className="hidden sm:grid grid-cols-[1fr_80px_140px_90px_36px] gap-2 px-4 py-2 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b">
        <span>Produk</span>
        <span className="text-center">Qty</span>
        <span>Harga Beli</span>
        <span className="text-right">Subtotal</span>
        <span />
      </div>

      <div className="divide-y">
        {cart.map((item) => {
          const subtotal = item.quantity * item.buyPrice
          return (
            <div key={item.uid} className="px-4 py-2.5 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_80px_140px_90px_36px] sm:gap-2 sm:items-center">
              {/* Produk */}
              <div className="min-w-0 flex items-start justify-between sm:block">
                <div>
                  <p className="text-sm font-medium truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.productCode} · {item.unit}</p>
                </div>
                {/* Hapus — tampil di kanan nama di mobile */}
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive sm:hidden shrink-0"
                  onClick={() => onRemove(item.uid)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Qty + Harga + Subtotal — row di mobile */}
              <div className="flex items-center gap-2 sm:contents">
                <div className="flex-1 sm:contents">
                  <Input
                    type="number" min={1}
                    value={item.quantity}
                    onChange={(e) => onUpdate(item.uid, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                    onFocus={(e) => e.target.select()}
                    className="h-8 text-sm text-center px-1 w-full sm:w-auto"
                  />
                </div>
                <div className="relative flex-[2] sm:contents">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">Rp</span>
                  <Input
                    type="number" min={0}
                    value={item.buyPrice}
                    onChange={(e) => onUpdate(item.uid, "buyPrice", parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    className="h-8 text-sm pl-6 w-full sm:w-auto"
                  />
                </div>
                <div className="text-right shrink-0 sm:contents">
                  <CurrencyDisplay amount={subtotal} className="text-sm font-semibold" />
                </div>
                {/* Hapus — hanya di sm+ */}
                <Button
                  type="button" variant="ghost" size="icon"
                  className="hidden sm:flex h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(item.uid)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── PurchaseForm ──────────────────────────────────────────────────────────────

export function PurchaseForm({ onSuccess, defaultVendorId }: PurchaseFormProps) {
  const toast = useToast()

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } =
    useForm<CreatePurchaseInput>({
      resolver: zodResolver(createPurchaseSchema),
      defaultValues: {
        vendorId: defaultVendorId ?? "",
        purchaseDate: new Date().toISOString().slice(0, 10),
        items: [],
        notes: "",
        confirmedPriceUpdates: [],
        paidAmount: undefined,
        paymentMethod: "CASH",
      },
    })

  const selectedVendorId = watch("vendorId")

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorDeposit, setVendorDeposit] = useState(0)
  const [cart, setCart] = useState<CartItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([])
  const [pendingData, setPendingData] = useState<CreatePurchaseInput | null>(null)
  const [showPriceAlert, setShowPriceAlert] = useState(false)
  // Satu dialog konfirmasi untuk semua kasus (lunas, hutang, overpay)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingConfirmedIds, setPendingConfirmedIds] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/vendors?isActive=true")
      .then((r) => r.json())
      .then((json) => setVendors(json.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedVendorId) { setVendorDeposit(0); return }
    fetch("/api/vendors/" + selectedVendorId + "/deposit")
      .then((r) => r.json())
      .then((json) => setVendorDeposit(json.data?.totalBalance ?? 0))
      .catch(() => setVendorDeposit(0))
  }, [selectedVendorId])

  function addToCart(item: Omit<CartItem, "uid">) {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === item.productId)
      if (existing) {
        return prev.map((c) =>
          c.productId === item.productId ? { ...c, quantity: c.quantity + item.quantity } : c
        )
      }
      return [...prev, { ...item, uid: crypto.randomUUID() }]
    })
  }

  function updateCartItem(uid: string, field: "quantity" | "buyPrice", value: number) {
    setCart((prev) => prev.map((c) => c.uid === uid ? { ...c, [field]: value } : c))
  }

  function removeFromCart(uid: string) {
    setCart((prev) => prev.filter((c) => c.uid !== uid))
  }

  const cartTotal = cart.reduce((s, i) => s + i.quantity * i.buyPrice, 0)

  // Sync cart ke RHF items agar validasi schema tidak block submit
  useEffect(() => {
    const items = cart.map((c) => ({ productId: c.productId, quantity: c.quantity, buyPrice: c.buyPrice }))
    setValue("items", items, { shouldValidate: false })
  }, [cart, setValue])

  async function onSubmit(formData: CreatePurchaseInput) {
    // Validasi cart manual — RHF tidak tahu soal cart state
    if (cart.length === 0) {
      toast.error("Tambahkan minimal 1 item ke daftar pembelian")
      return
    }
    const items = cart.map((c) => ({ productId: c.productId, quantity: c.quantity, buyPrice: c.buyPrice }))
    const data: CreatePurchaseInput = { ...formData, items }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/purchases/detect-price-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })
      if (res.ok) {
        const json = await res.json()
        const changes: PriceChange[] = json.data ?? []
        if (changes.some((c) => c.changed)) {
          setPriceChanges(changes)
          setPendingData(data)
          setShowPriceAlert(true)
          setIsSubmitting(false)
          return
        }
      }
    } catch {}
    await checkAndSubmit(data, [])
  }

  // Dipanggil saat RHF validation gagal — tampilkan error ke user
  function onInvalid(fieldErrors: Record<string, unknown>) {
    const messages: string[] = []
    if (fieldErrors.vendorId) messages.push("Vendor wajib dipilih")
    if (fieldErrors.purchaseDate) messages.push("Tanggal wajib diisi")
    if (cart.length === 0) messages.push("Tambahkan minimal 1 item")
    if (messages.length > 0) {
      toast.error(messages.join(" · "))
    } else {
      toast.error("Periksa kembali form sebelum menyimpan")
    }
  }

  async function checkAndSubmit(data: CreatePurchaseInput, confirmedPriceUpdates: string[]) {
    // Semua kasus (lunas, hutang, overpay) → tampilkan dialog konfirmasi terpusat
    setPendingData(data)
    setPendingConfirmedIds(confirmedPriceUpdates)
    setShowConfirmDialog(true)
    setIsSubmitting(false)
  }

  async function submitPurchase(data: CreatePurchaseInput, confirmedPriceUpdates: string[], receiptImageUrl: string) {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, confirmedPriceUpdates, receiptImageUrl: receiptImageUrl || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan pembelian")
      setShowConfirmDialog(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">

          {/* ── Kiri: Item pembelian ── */}
          <div className="space-y-4">
            {/* Info: vendor + tanggal + catatan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                  Vendor
                </Label>
                <Select defaultValue={defaultVendorId} onValueChange={(val) => setValue("vendorId", val)}>
                  <SelectTrigger aria-invalid={!!errors.vendorId} className="h-9">
                    <SelectValue placeholder="Pilih vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vendorId && <p className="text-xs text-destructive">{errors.vendorId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  Tanggal
                </Label>
                <Input type="date" className="h-9" {...register("purchaseDate")} />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Catatan
                </Label>
                <Input placeholder="Catatan (opsional)" className="h-9" {...register("notes")} />
              </div>
            </div>

            {/* Tabel item */}
            {/* overflow-hidden aman karena dropdown pakai position:fixed */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Item Pembelian</span>
                  {cart.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{cart.length}</Badge>
                  )}
                </div>
              </div>

              {/* Form tambah item */}
              <AddItemBar vendorId={selectedVendorId || undefined} onAdd={addToCart} />

              {/* Tabel cart */}
              <CartTable cart={cart} onUpdate={updateCartItem} onRemove={removeFromCart} />

              {/* Footer total */}
              {cart.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                  <span className="text-sm text-muted-foreground">{cart.length} jenis produk</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Total:</span>
                    <CurrencyDisplay amount={cartTotal} className="text-lg font-bold" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Kanan: Payment panel ── */}
          <div className="lg:sticky lg:top-4">
            <PaymentPanel
              control={control}
              watch={watch}
              setValue={setValue}
              cartTotal={cartTotal}
              vendorDeposit={vendorDeposit}
              isSubmitting={isSubmitting}
              cartEmpty={cart.length === 0}
            />
          </div>
        </div>
      </form>

      <PriceChangeAlert
        open={showPriceAlert}
        changes={priceChanges}
        onConfirm={(ids) => { setShowPriceAlert(false); pendingData && checkAndSubmit(pendingData, ids) }}
        onSkip={() => { setShowPriceAlert(false); pendingData && checkAndSubmit(pendingData, []) }}
      />

      {/* Dialog konfirmasi terpusat — menggantikan dialog overpay & debt terpisah */}
      {pendingData && (
        <PurchaseConfirmDialog
          open={showConfirmDialog}
          onOpenChange={(open) => { if (!open && !isSubmitting) setShowConfirmDialog(false) }}
          vendorName={vendors.find((v) => v.id === pendingData.vendorId)?.name ?? "Vendor"}
          purchaseDate={pendingData.purchaseDate}
          cart={cart}
          cartTotal={cartTotal}
          paidAmount={pendingData.paidAmount}
          paymentMethod={pendingData.paymentMethod ?? "CASH"}
          isSubmitting={isSubmitting}
          onConfirm={(receiptImageUrl) => {
            submitPurchase(pendingData, pendingConfirmedIds, receiptImageUrl)
          }}
        />
      )}
    </>
  )
}

// ── PaymentPanel ──────────────────────────────────────────────────────────────

interface PaymentPanelProps {
  control: Control<CreatePurchaseInput>
  watch: ReturnType<typeof useForm<CreatePurchaseInput>>["watch"]
  setValue: ReturnType<typeof useForm<CreatePurchaseInput>>["setValue"]
  cartTotal: number
  vendorDeposit: number
  isSubmitting: boolean
  cartEmpty: boolean
}

function PaymentPanel({ control, watch, setValue, cartTotal, vendorDeposit, isSubmitting, cartEmpty }: PaymentPanelProps) {
  const paidAmount = useWatch({ control, name: "paidAmount" })
  const paymentMethod = watch("paymentMethod")

  const paid = paidAmount ?? undefined
  const debt = paid !== undefined ? Math.max(0, cartTotal - paid) : cartTotal
  const overpay = paid !== undefined ? Math.max(0, paid - cartTotal) : 0
  const isFullPay = paid !== undefined && paid >= cartTotal && overpay === 0
  const isDebt = paid === undefined || paid < cartTotal

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
        <Banknote className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Pembayaran</span>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Pembelian</span>
          <CurrencyDisplay amount={cartTotal} className="text-xl font-bold" />
        </div>

        <Separator />

        {vendorDeposit > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 px-3 py-2.5">
            <Wallet className="h-4 w-4 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Deposit Tersedia</p>
              <CurrencyDisplay amount={vendorDeposit} className="text-sm font-bold text-blue-700 dark:text-blue-400" />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Metode Bayar</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {(["CASH", "TRANSFER"] as const).map((m) => (
              <button
                key={m} type="button"
                onClick={() => setValue("paymentMethod", m)}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                  paymentMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                }`}
              >
                {m === "CASH" ? "Tunai" : "Transfer"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Nominal Bayar</Label>
            <span className="text-xs text-muted-foreground">Kosong = hutang semua</span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
            <Input
              type="number" min={0} placeholder="0"
              className="pl-9 h-11 text-lg font-semibold"
              value={paidAmount ?? ""}
              onChange={(e) => {
                const raw = e.target.value
                setValue("paidAmount", raw === "" ? undefined : parseFloat(raw) || 0)
              }}
            />
          </div>
          {cartTotal > 0 && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setValue("paidAmount", undefined)}
                className={`flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                  paidAmount === undefined
                    ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                Hutang
              </button>
              <button
                type="button"
                onClick={() => setValue("paidAmount", cartTotal)}
                className={`flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                  paidAmount === cartTotal
                    ? "border-green-400 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                Lunas
              </button>
            </div>
          )}
        </div>

        {cartTotal > 0 && (
          <div className={`rounded-lg border p-3 space-y-1.5 text-sm ${
            overpay > 0
              ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50"
              : isFullPay
              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50"
              : "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50"
          }`}>
            {isDebt && debt > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-orange-700 dark:text-orange-400 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Hutang ke vendor
                </span>
                <CurrencyDisplay amount={debt} className="text-sm font-bold text-orange-700 dark:text-orange-400" />
              </div>
            )}
            {isFullPay && (
              <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Lunas
              </div>
            )}
            {overpay > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-medium">
                  <Wallet className="h-3.5 w-3.5" />
                  Kelebihan akan jadi deposit
                </span>
                <CurrencyDisplay amount={overpay} className="text-sm font-bold text-blue-700 dark:text-blue-400" />
              </div>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || cartEmpty}
          className="w-full h-11 gap-2 text-base font-semibold"
        >
          {isSubmitting
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</>
            : <><PackagePlus className="h-4 w-4" /> Simpan Pembelian</>
          }
        </Button>
      </div>
    </div>
  )
}
