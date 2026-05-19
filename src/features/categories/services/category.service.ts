import { prisma } from "@/lib/prisma"
import { ConflictError, NotFoundError } from "@/lib/exceptions"
import type { CreateCategoryInput, UpdateCategoryInput } from "../schemas"

export async function getAllCategories() {
  return prisma.category.findMany({
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  })
}

export async function getCategoryById(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  })
  if (!category) throw new NotFoundError("Kategori")
  return category
}

export async function createCategory(data: CreateCategoryInput) {
  const existing = await prisma.category.findUnique({ where: { name: data.name } })
  if (existing) throw new ConflictError("Nama kategori sudah digunakan")
  return prisma.category.create({ data })
}

export async function updateCategory(id: string, data: UpdateCategoryInput) {
  await getCategoryById(id)
  const duplicate = await prisma.category.findFirst({
    where: { name: data.name, NOT: { id } },
  })
  if (duplicate) throw new ConflictError("Nama kategori sudah digunakan")
  return prisma.category.update({ where: { id }, data })
}

export async function deleteCategory(id: string) {
  await getCategoryById(id)
  const activeProducts = await prisma.product.count({
    where: { categoryId: id, isActive: true },
  })
  if (activeProducts > 0)
    throw new ConflictError(
      `Kategori tidak bisa dihapus karena masih digunakan oleh ${activeProducts} produk aktif`
    )
  return prisma.category.delete({ where: { id } })
}
