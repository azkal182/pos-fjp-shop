import type { Category, Product } from "@/generated/prisma"

export type ProductWithCategory = Product & {
  category: Category
}

export interface ProductListFilter {
  search?: string
  categoryId?: string
  isActive?: boolean
  lowStock?: boolean
  page?: number
  limit?: number
}
