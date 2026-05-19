import { prisma } from "@/lib/prisma"
import { ConflictError, NotFoundError } from "@/lib/exceptions"
import { log } from "@/lib/logger"
import { calculatePagination } from "@/lib/api-response"
import type { CreateProductInput, UpdateProductInput } from "../schemas/product.schema"
import type { ProductListFilter } from "../types/product.types"

export async function getAllProducts(filter: ProductListFilter = {}) {
  const { search, categoryId, isActive, lowStock, page = 1, limit = 20 } = filter

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { code: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(categoryId && { categoryId }),
    ...(isActive !== undefined && { isActive }),
  }

  // lowStock filter: stock <= minStock — handled post-query for Prisma field comparison
  const [allData, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: "asc" },
      ...(lowStock ? {} : { skip: (page - 1) * limit, take: limit }),
    }),
    prisma.product.count({ where }),
  ])

  if (lowStock) {
    const filtered = allData.filter((p) => p.stock <= p.minStock)
    const paginatedFiltered = filtered.slice((page - 1) * limit, page * limit)
    return { data: paginatedFiltered, meta: calculatePagination(page, limit, filtered.length) }
  }

  return { data: allData, meta: calculatePagination(page, limit, total) }
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      _count: { select: { stockMovements: true } },
    },
  })
  if (!product) throw new NotFoundError("Produk")
  return product
}

export async function createProduct(data: CreateProductInput) {
  const existing = await prisma.product.findUnique({ where: { code: data.code } })
  if (existing) throw new ConflictError(`Kode produk "${data.code}" sudah digunakan`)

  return prisma.product.create({
    data: {
      code: data.code,
      name: data.name,
      categoryId: data.categoryId,
      unit: data.unit,
      buyPrice: data.buyPrice,
      sellPrice: data.sellPrice,
      minStock: data.minStock ?? 0,
      isActive: data.isActive ?? true,
    },
    include: { category: true },
  })
}

export async function updateProduct(id: string, data: UpdateProductInput) {
  await getProductById(id)

  if (data.code) {
    const duplicate = await prisma.product.findFirst({
      where: { code: data.code, NOT: { id } },
    })
    if (duplicate) throw new ConflictError(`Kode produk "${data.code}" sudah digunakan`)
  }

  // Pastikan field stock tidak bisa diupdate langsung
  const { ...safeData } = data as UpdateProductInput & { stock?: never }

  return prisma.product.update({
    where: { id },
    data: safeData,
    include: { category: true },
  })
}

export async function softDeleteProduct(id: string) {
  await getProductById(id)
  log.info("[PRODUCT]", "Soft delete product", { productId: id })
  return prisma.product.update({
    where: { id },
    data: { isActive: false },
  })
}

export async function getLowStockProducts() {
  // Ambil produk aktif yang stoknya <= minStock
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { stock: "asc" },
  })
  return products.filter((p) => p.stock <= p.minStock)
}
