import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NotFoundError, ConflictError, ValidationError } from "@/lib/exceptions"
import type { CreateUserInput, UpdateUserInput } from "../schemas/user.schema"

export async function getAllUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, createdAt: true, emailVerified: true },
    orderBy: { createdAt: "asc" },
  })
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, createdAt: true, emailVerified: true },
  })
  if (!user) throw new NotFoundError("User")
  return user
}

export async function createUser(data: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) throw new ConflictError("Email sudah digunakan")

  const result = await auth.api.signUpEmail({
    body: { name: data.name, email: data.email, password: data.password },
  })

  if (!result.user) throw new ValidationError("Gagal membuat user")
  return result.user
}

export async function updateUser(id: string, data: UpdateUserInput) {
  await getUserById(id)

  if (data.email) {
    const existing = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id } },
    })
    if (existing) throw new ConflictError("Email sudah digunakan")
  }

  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, createdAt: true },
  })
}

export async function deleteUser(id: string, currentUserId: string) {
  if (id === currentUserId) throw new ValidationError("Tidak bisa menghapus akun sendiri")

  const count = await prisma.user.count()
  if (count <= 1) throw new ConflictError("Minimal harus ada 1 user")

  await getUserById(id)
  await prisma.user.delete({ where: { id } })
}
