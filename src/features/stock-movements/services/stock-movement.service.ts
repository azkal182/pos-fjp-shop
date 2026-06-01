import type { PrismaClient, StockMovementType } from "@/generated/prisma"
import { prisma as globalPrisma } from "@/lib/prisma"
import { log } from "@/lib/logger"
import { calculatePagination } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>

interface CreateMovementData {
  productId: string
  type: StockMovementType
  quantity: number // positif = masuk, negatif = keluar
  referenceCode?: string
  notes?: string
  purchaseId?: string
  transactionId?: string
}

/** Internal — hanya dipanggil di dalam prisma.$transaction */
export async function createMovement(tx: TxClient, data: CreateMovementData) {
  const product = await tx.product.findUniqueOrThrow({ where: { id: data.productId } })
  const stockBefore = product.stock
  const stockAfter = stockBefore + data.quantity
  if (stockAfter < 0) {
    throw new ValidationError(`Stok tidak cukup. Perubahan ${data.quantity} membuat stok menjadi ${stockAfter}`)
  }

  const movement = await tx.stockMovement.create({
    data: {
      productId: data.productId,
      type: data.type,
      quantity: data.quantity,
      stockBefore,
      stockAfter,
      referenceCode: data.referenceCode,
      notes: data.notes,
      purchaseId: data.purchaseId,
      transactionId: data.transactionId,
    },
  })

  await tx.product.update({
    where: { id: data.productId },
    data: { stock: stockAfter },
  })

  log.info("[STOCK]", "Stock movement created", {
    productId: data.productId,
    type: data.type,
    quantity: data.quantity,
    stockBefore,
    stockAfter,
    referenceCode: data.referenceCode,
  })

  return movement
}

export interface StockMovementFilter {
  productId?: string
  productSearch?: string
  type?: StockMovementType
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export async function getAllStockMovements(filter: StockMovementFilter = {}) {
  const { productId, productSearch, type, dateFrom, dateTo, page = 1, limit = 20 } = filter

  const where = {
    ...(productId && { productId }),
    ...(productSearch && {
      product: {
        OR: [
          { name: { contains: productSearch, mode: "insensitive" as const } },
          { code: { contains: productSearch, mode: "insensitive" as const } },
        ],
      },
    }),
    ...(type && { type }),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      },
    }),
  }

  const [data, total] = await Promise.all([
    globalPrisma.stockMovement.findMany({
      where,
      include: { product: { select: { id: true, name: true, code: true, unit: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    globalPrisma.stockMovement.count({ where }),
  ])

  return { data, meta: calculatePagination(page, limit, total) }
}
