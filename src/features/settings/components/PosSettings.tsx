"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useToast } from "@/hooks/useToast"
import { useSettingsStore } from "@/stores/settings.store"

const PAYMENT_OPTIONS = [
  { value: "CASH", label: "Tunai (Cash)" },
  { value: "TRANSFER", label: "Transfer Bank" },
]

export function PosSettings() {
  const toast = useToast()
  const { pos, load } = useSettingsStore()
  const [selected, setSelected] = useState<string[]>(pos.paymentMethods)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    load().then(() => {
      setSelected(useSettingsStore.getState().pos.paymentMethods)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  async function handleSave() {
    if (selected.length === 0) {
      toast.error("Minimal 1 metode bayar harus aktif")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ key: "pos_payment_methods", value: selected.join(",") }]),
      })
      if (!res.ok) throw new Error()
      useSettingsStore.setState({ isLoaded: false })
      await load()
      toast.success("Pengaturan POS berhasil disimpan")
    } catch {
      toast.error("Gagal menyimpan pengaturan")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Metode Pembayaran Tersedia</Label>
        <p className="text-xs text-muted-foreground">Pilih metode bayar yang tersedia di kasir (POS)</p>
        {PAYMENT_OPTIONS.map((opt) => (
          <div key={opt.value} className="flex items-center gap-3 rounded-md border px-3 py-2.5">
            <Checkbox
              id={`pm-${opt.value}`}
              checked={selected.includes(opt.value)}
              onCheckedChange={() => toggle(opt.value)}
            />
            <Label htmlFor={`pm-${opt.value}`} className="cursor-pointer font-normal">
              {opt.label}
            </Label>
          </div>
        ))}
      </div>
      <Button onClick={handleSave} disabled={isSubmitting}>
        {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
        Simpan Pengaturan
      </Button>
    </div>
  )
}
