"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { UserTable } from "@/features/users/components/UserTable"
import { UserForm } from "@/features/users/components/UserForm"
import { useToast } from "@/hooks/useToast"
import { useSession } from "@/lib/auth-client"
import type { CreateUserInput } from "@/features/users/schemas/user.schema"

interface User { id: string; name: string; email: string; createdAt: string }

export default function UsersPage() {
  const toast = useToast()
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/users")
      const json = await res.json()
      setUsers(json.data ?? [])
    } catch { toast.error("Gagal memuat pengguna") }
    finally { setIsLoading(false) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleCreate(data: CreateUserInput) {
    setIsCreating(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal menambah pengguna")
      toast.success("Pengguna berhasil ditambahkan")
      setIsCreateOpen(false)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally { setIsCreating(false) }
  }

  return (
    <PageWrapper
      title="Pengguna"
      actions={
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Pengguna
        </Button>
      }
    >
      <UserTable
        data={users}
        isLoading={isLoading}
        currentUserId={session?.user.id ?? ""}
        onRefetch={fetchUsers}
      />
      <UserForm
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate as any}
        isLoading={isCreating}
        mode="create"
      />
    </PageWrapper>
  )
}
