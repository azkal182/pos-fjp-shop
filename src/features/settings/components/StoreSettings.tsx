"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { useToast } from "@/hooks/useToast"
import { useSettingsStore } from "@/stores/settings.store"

interface StoreForm {
  store_name: string
  store_address: string
  store_phone: string
  store_receipt_note: string
}

export function StoreSettings() {
  const toast = useToast()
  const { store, load } = useSettingsStore()

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<StoreForm>({
    defaultValues: {
      store_name: store.storeName,
      store_address: store.storeAddress,
      store_phone: store.storePhone,
      store_receipt_note: store.receiptNote,
    },
  })

  useEffect(() => {
    load().then(() => {
      const s = useSettingsStore.getState().store
      reset({
        store_name: s.storeName,
        store_address: s.storeAddress,
        store_phone: s.storePhone,
        store_receipt_note: s.receiptNote,
      })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(data: StoreForm) {
    try {
      const updates = Object.entries(data).map(([key, value]) => ({ key, value }))
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error("Gagal menyimpan")
      // Invalidate settings store
      useSettingsStore.setState({ isLoaded: false })
      await load()
      toast.success("Pengaturan toko berhasil disimpan")
    } catch {
      toast.error("Gagal menyimpan pengaturan")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="store_name">Nama Toko</Label>
        <Input id="store_name" {...register("store_name")} placeholder="FJP Shop" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="store_phone">No. HP / Telepon</Label>
        <Input id="store_phone" {...register("store_phone")} placeholder="08xx-xxxx-xxxx" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="store_address">Alamat Toko</Label>
        <Textarea id="store_address" {...register("store_address")} placeholder="Alamat lengkap toko..." rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="store_receipt_note">Catatan Struk</Label>
        <Textarea id="store_receipt_note" {...register("store_receipt_note")} placeholder="Terima kasih telah berbelanja..." rows={2} />
        <p className="text-xs text-muted-foreground">Teks ini akan muncul di bagian bawah struk</p>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
        Simpan Pengaturan
      </Button>
    </form>
  )
}
