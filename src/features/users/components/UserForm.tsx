"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from "../schemas/user.schema"

interface UserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: { name: string; email: string }
  onSubmit: (data: CreateUserInput | UpdateUserInput) => Promise<void>
  isLoading?: boolean
  mode?: "create" | "edit"
}

export function UserForm({ open, onOpenChange, defaultValues, onSubmit, isLoading, mode = "create" }: UserFormProps) {
  const [showPassword, setShowPassword] = useState(false)

  const schema = mode === "create" ? createUserSchema : updateUserSchema
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: "", email: "", password: "" },
    values: defaultValues,
  })

  function handleClose() { reset(); onOpenChange(false) }

  async function handleFormSubmit(data: any) {
    await onSubmit(data)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah Pengguna" : "Edit Pengguna"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="u-name">Nama</Label>
            <Input id="u-name" {...register("name")} placeholder="Nama lengkap" aria-invalid={!!errors.name} />
            {errors.name && <p className="text-xs text-destructive">{String(errors.name.message)}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-email">Email</Label>
            <Input id="u-email" type="email" {...register("email")} placeholder="email@example.com" aria-invalid={!!errors.email} />
            {errors.email && <p className="text-xs text-destructive">{String(errors.email.message)}</p>}
          </div>
          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="u-password">Password</Label>
              <div className="relative">
                <Input
                  id="u-password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="Min. 8 karakter"
                  className="pr-10"
                  aria-invalid={!!errors.password}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{String(errors.password.message)}</p>}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>Batal</Button>
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
