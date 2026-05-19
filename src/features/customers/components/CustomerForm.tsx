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
import { createCustomerSchema, type CreateCustomerInput } from "../schemas/customer.schema"

interface CustomerFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: Partial<CreateCustomerInput>
  onSubmit: (data: CreateCustomerInput) => Promise<void>
  isLoading?: boolean
  mode?: "create" | "edit"
}

export function CustomerForm({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  isLoading = false,
  mode = "create",
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: { name: "", phone: "", address: "", isActive: true, ...defaultValues },
    values: defaultValues as CreateCustomerInput | undefined,
  })

  const isActive = watch("isActive")

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  async function handleFormSubmit(data: CreateCustomerInput) {
    await onSubmit(data)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah Customer" : "Edit Customer"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">Nama Customer</Label>
            <Input
              id="c-name"
              placeholder="Nama lengkap customer..."
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-phone">No. Telepon <span className="text-muted-foreground">(opsional)</span></Label>
            <Input
              id="c-phone"
              placeholder="08xx-xxxx-xxxx"
              {...register("phone")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-address">Alamat <span className="text-muted-foreground">(opsional)</span></Label>
            <Textarea
              id="c-address"
              placeholder="Alamat lengkap customer..."
              rows={3}
              {...register("address")}
            />
          </div>

          {mode === "edit" && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Status Aktif</p>
                <p className="text-xs text-muted-foreground">Customer nonaktif tidak bisa dipilih di POS</p>
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
