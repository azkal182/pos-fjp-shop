import type { Category, Product } from "@/generated/prisma"

export type ProductWithCategory = Product & {
  category: Category
}

export interface ProductListFilter {
  search?: string
  categoryId?: string
  vendorId?: string
  isActive?: boolean
  lowStock?: boolean
  page?: number
  limit?: number
}
