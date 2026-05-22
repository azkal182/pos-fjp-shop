"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { ImageUpload } from "@/components/shared/ImageUpload"
import { useToast } from "@/hooks/useToast"
import { ReceiptContent } from "@/features/pos/components/ReceiptContent"
import { useSettingsStore } from "@/stores/settings.store"

interface PrinterForm {
  printer_receipt_width: "58mm" | "80mm"
}

// Mock data untuk preview — mencerminkan transaksi nyata
const MOCK_TRANSACTION = {
  id: "preview",
  code: "TRX-20260523-0001",
  subtotal: 85000,
  discountAmount: 5000,
  packingFee: 3000,
  totalAmount: 83000,
  paidAmount: 100000,
  changeAmount: 17000,
  debtAmount: 0,
  paymentMethod: "CASH",
  paymentStatus: "PAID",
  transactionDate: new Date().toISOString(),
  customer: { name: "Budi Santoso", phone: "08123456789" },
  user: { name: "Admin" },
  items: [
    {
      id: "1",
      productName: "Kopi Arabika 250gr",
      quantity: 2,
      sellPrice: 35000,
      discountAmount: 5000,
      subtotal: 65000,
    },
    {
      id: "2",
      productName: "Teh Hijau Premium",
      quantity: 1,
      sellPrice: 20000,
      discountAmount: 0,
      subtotal: 20000,
    },
  ],
}

export function PrinterSettings() {
  const toast = useToast()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const { store, load: loadStore } = useSettingsStore()

  const { handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm<PrinterForm>({
    defaultValues: { printer_receipt_width: "80mm" },
  })

  const currentWidth = watch("printer_receipt_width")

  // Load settings dari server
  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      loadStore(),
    ])
      .then(([json]) => {
        const printer = json.data?.PRINTER ?? {}
        const storeData = json.data?.STORE ?? {}
        const width = printer["printer_receipt_width"] ?? "80mm"
        setValue("printer_receipt_width", width as "58mm" | "80mm")
        setLogoUrl(storeData["store_logo_url"] || null)
      })
      .catch(() => {})
      .finally(() => setIsLoadingSettings(false))
  }, [setValue, loadStore])

  async function onSubmit(data: PrinterForm) {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          { key: "printer_receipt_width", value: data.printer_receipt_width },
        ]),
      })
      if (!res.ok) throw new Error()
      toast.success("Pengaturan printer berhasil disimpan")
    } catch {
      toast.error("Gagal menyimpan pengaturan printer")
    }
  }

  async function handleLogoChange(url: string | null) {
    setLogoUrl(url)
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ key: "store_logo_url", value: url ?? "" }]),
      })
      // Refresh store settings agar nama toko di preview ikut update
      useSettingsStore.setState({ isLoaded: false })
      await loadStore()
      toast.success(url ? "Logo berhasil diupload" : "Logo berhasil dihapus")
    } catch {
      toast.error("Gagal menyimpan logo")
    }
  }

  // Settings toko untuk preview — pakai data real dari store
  const previewStoreSettings = {
    storeName: store.storeName || "Nama Toko",
    storeAddress: store.storeAddress || "Jl. Contoh No. 1, Kota",
    storePhone: store.storePhone || "08xx-xxxx-xxxx",
    receiptNote: store.receiptNote || "Terima kasih telah berbelanja!",
  }

  if (isLoadingSettings) {
    return <LoadingSpinner centered />
  }

  return (
    <div className="flex flex-col xl:flex-row gap-8">
      {/* ── Kolom kiri: Form ── */}
      <div className="space-y-8 w-full xl:max-w-sm shrink-0">
        {/* Logo Nota */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold">Logo Nota</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Logo tampil di bagian atas struk. Disimpan di Cloudflare R2.
            </p>
          </div>
          <ImageUpload
            value={logoUrl}
            onChange={handleLogoChange}
            folder="logos"
            label=""
            hint="JPG, PNG, WebP, SVG. Maks 5 MB. Rasio 3:1 atau persegi."
          />
        </div>

        <Separator />

        {/* Lebar Kertas */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold">Lebar Kertas Thermal</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sesuaikan dengan printer thermal yang digunakan
              </p>
            </div>

            <RadioGroup
              value={currentWidth}
              onValueChange={(v) => setValue("printer_receipt_width", v as "58mm" | "80mm")}
              className="space-y-3"
            >
              <div className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="58mm" id="w58" className="mt-0.5" />
                <Label htmlFor="w58" className="cursor-pointer space-y-1">
                  <span className="font-medium">58mm</span>
                  <p className="text-xs text-muted-foreground font-normal">
                    Printer thermal kecil / portable. ~32 karakter per baris.
                  </p>
                </Label>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="80mm" id="w80" className="mt-0.5" />
                <Label htmlFor="w80" className="cursor-pointer space-y-1">
                  <span className="font-medium">80mm</span>
                  <p className="text-xs text-muted-foreground font-normal">
                    Printer thermal standar kasir. ~48 karakter per baris. (Direkomendasikan)
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
            Simpan Pengaturan Printer
          </Button>
        </form>
      </div>

      {/* ── Kolom kanan: Preview ── */}
      <div className="flex-1 min-w-0">
        <div className="sticky top-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Preview Nota</h4>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {currentWidth} · Mock data
            </span>
          </div>

          {/* Container preview — background abu seperti halaman print */}
          <div className="rounded-xl border bg-neutral-100 dark:bg-neutral-900 p-6 flex justify-center overflow-x-auto">
            <div
              className="shadow-lg rounded"
              style={{
                // Scale down agar muat di layar tanpa scroll horizontal
                transformOrigin: "top center",
              }}
            >
              <ReceiptContent
                transaction={MOCK_TRANSACTION}
                storeSettings={previewStoreSettings}
                logoUrl={logoUrl}
                receiptWidth={currentWidth}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2 text-center">
            Preview menggunakan data toko dari tab <span className="font-medium">Toko</span> dan mock transaksi
          </p>
        </div>
      </div>
    </div>
  )
}
