"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { createVendorSchema, type CreateVendorInput } from "../schemas"

interface VendorFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: Partial<CreateVendorInput>
  onSubmit: (data: CreateVendorInput) => Promise<void>
  isLoading?: boolean
  mode?: "create" | "edit"
}

export function VendorForm({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  isLoading = false,
  mode = "create",
}: VendorFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateVendorInput>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: { name: "", phone: "", address: "", isActive: true, ...defaultValues },
    values: defaultValues as CreateVendorInput | undefined,
  })

  const isActive = watch("isActive")

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  async function handleFormSubmit(data: CreateVendorInput) {
    await onSubmit(data)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah Vendor" : "Edit Vendor"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="v-name">Nama Vendor</Label>
            <Input
              id="v-name"
              placeholder="Nama vendor atau perusahaan..."
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="v-phone">No. Telepon <span className="text-muted-foreground">(opsional)</span></Label>
            <Input
              id="v-phone"
              placeholder="08xx-xxxx-xxxx"
              {...register("phone")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="v-address">Alamat <span className="text-muted-foreground">(opsional)</span></Label>
            <Textarea
              id="v-address"
              placeholder="Alamat lengkap vendor..."
              rows={3}
              {...register("address")}
            />
          </div>

          {mode === "edit" && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Status Aktif</p>
                <p className="text-xs text-muted-foreground">Vendor nonaktif tidak bisa dipilih saat pembelian</p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(val) => setValue("isActive", val)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
              {mode === "create" ? "Tambah" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
