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
import { ExternalLink } from "lucide-react"

interface PrinterForm {
  printer_receipt_width: "58mm" | "80mm"
}

export function PrinterSettings() {
  const toast = useToast()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoadingLogo, setIsLoadingLogo] = useState(true)

  const { handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm<PrinterForm>({
    defaultValues: { printer_receipt_width: "80mm" },
  })

  const currentWidth = watch("printer_receipt_width")

  // Load settings dari server
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((json) => {
        const store = json.data?.STORE ?? {}
        const printer = json.data?.PRINTER ?? {}
        const width = printer["printer_receipt_width"] ?? store["printer_receipt_width"] ?? "80mm"
        setValue("printer_receipt_width", width as "58mm" | "80mm")
        setLogoUrl(store["store_logo_url"] ?? null)
      })
      .catch(() => {})
      .finally(() => setIsLoadingLogo(false))
  }, [setValue])

  async function onSubmit(data: PrinterForm) {
    try {
      const updates = [
        { key: "printer_receipt_width", value: data.printer_receipt_width },
      ]
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
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
      toast.success(url ? "Logo berhasil diupload" : "Logo berhasil dihapus")
    } catch {
      toast.error("Gagal menyimpan logo")
    }
  }

  return (
    <div className="space-y-8 max-w-lg">
      {/* Logo Nota */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold">Logo Nota</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Logo akan tampil di bagian atas struk. Disimpan di Cloudflare R2.
          </p>
        </div>

        {isLoadingLogo ? (
          <LoadingSpinner size="sm" />
        ) : (
          <ImageUpload
            value={logoUrl}
            onChange={handleLogoChange}
            folder="logos"
            label=""
            hint="Format: JPG, PNG, WebP, SVG. Maks 5 MB. Disarankan rasio 3:1 atau persegi."
          />
        )}
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

        {/* Preview link */}
        <div className="rounded-lg bg-muted/40 border p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Preview Nota</p>
          <p className="text-xs">
            Buka halaman <code className="bg-muted px-1 rounded text-xs">/print/receipt/[id]</code> untuk
            melihat preview nota sebelum cetak. Halaman ini akan auto-print saat dibuka.
          </p>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
          Simpan Pengaturan Printer
        </Button>
      </form>
    </div>
  )
}
