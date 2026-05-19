"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { UserForm } from "./UserForm"
import { useToast } from "@/hooks/useToast"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { UpdateUserInput } from "../schemas/user.schema"

interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

interface UserTableProps {
  data: User[]
  isLoading?: boolean
  currentUserId: string
  onRefetch: () => void
}

export function UserTable({ data, isLoading, currentUserId, onRefetch }: UserTableProps) {
  const toast = useToast()
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleEdit(formData: UpdateUserInput) {
    if (!editTarget) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal mengupdate user")
      toast.success("User berhasil diupdate")
      setEditTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally { setIsSubmitting(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menghapus user")
      toast.success("User berhasil dihapus")
      setDeleteTarget(null)
      onRefetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally { setIsDeleting(false) }
  }

  const columns: Column<User>[] = [
    {
      header: "Nama",
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.name}</p>
          {row.id === currentUserId && (
            <span className="text-xs text-primary font-medium">Anda</span>
          )}
        </div>
      ),
    },
    { header: "Email", render: (row) => <span className="text-sm text-muted-foreground">{row.email}</span> },
    {
      header: "Bergabung",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.createdAt), "dd MMM yyyy", { locale: idLocale })}
        </span>
      ),
    },
    {
      header: "Aksi",
      className: "w-[100px] text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTarget(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {row.id === currentUserId ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-30" disabled>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Tidak bisa hapus akun sendiri</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="Belum ada pengguna"
        keyExtractor={(row) => row.id}
      />
      <UserForm
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        defaultValues={editTarget ? { name: editTarget.name, email: editTarget.email } : undefined}
        onSubmit={handleEdit}
        isLoading={isSubmitting}
        mode="edit"
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Hapus Pengguna"
        description={`Yakin ingin menghapus pengguna "${deleteTarget?.name}"?`}
        confirmLabel="Hapus"
        isLoading={isDeleting}
      />
    </>
  )
}
