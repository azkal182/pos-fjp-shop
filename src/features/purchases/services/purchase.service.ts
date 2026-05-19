import { prisma } from "@/lib/prisma"
import { NotFoundError, ValidationError } from "@/lib/exceptions"
import { log } from "@/lib/logger"
import { generateCode } from "@/lib/utils"
import { calculatePagination } from "@/lib/api-response"
import { createMovement } from "@/features/stock-movements/services/stock-movement.service"
import { updateAfterPurchase } from "@/features/products/services/product-vendor-price.service"
import type { CreatePurchaseInput, PriceChange } from "../schemas/purchase.schema"

export interface PurchaseFilter {
  vendorId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export async function getAllPurchases(filter: PurchaseFilter = {}) {
  const { vendorId, dateFrom, dateTo, page = 1, limit = 20 } = filter

  const where = {
    ...(vendorId && { vendorId }),
    ...((dateFrom || dateTo) && {
      purchaseDate: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      },
    }),
  }

  const [data, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { purchaseDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.purchase.count({ where }),
  ])

  return { data, meta: calculatePagination(page, limit, total) }
}

export async function getPurchaseById(id: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      vendor: true,
      user: { select: { id: true, name: true, email: true } },
      items: {
        include: { product: { select: { id: true, name: true, code: true, unit: true } } },
      },
    },
  })
  if (!purchase) throw new NotFoundError("Pembelian")
  return purchase
}

export async function detectPriceChanges(
  items: { productId: string; buyPrice: number }[]
): Promise<PriceChange[]> {
  const productIds = items.map((i) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, code: true, buyPrice: true },
  })

  return items.map((item) => {
    const product = products.find((p) => p.id === item.productId)
    if (!product) return null
    const previousBuyPrice = Number(product.buyPrice)
    const newBuyPrice = item.buyPrice
    return {
      productId: item.productId,
      productName: product.name,
      productCode: product.code,
      previousBuyPrice,
      newBuyPrice,
      changed: previousBuyPrice !== newBuyPrice,
    }
  }).filter(Boolean) as PriceChange[]
}

export async function createPurchase(data: CreatePurchaseInput, userId: string) {
  // Validasi vendor aktif
  const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId }, select: { isActive: true, name: true } })
  if (!vendor) throw new NotFoundError("Vendor")
  if (!vendor.isActive) throw new ValidationError("Vendor tidak aktif")

  // Validasi semua produk aktif
  for (const item of data.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { isActive: true, name: true } })
    if (!product) throw new NotFoundError(`Produk tidak ditemukan`)
    if (!product.isActive) throw new ValidationError(`Produk "${product.name}" tidak aktif`)
  }

  const code = generateCode("PO")
  const totalAmount = data.items.reduce(
    (sum, item) => sum + item.quantity * item.buyPrice,
    0
  )

  const purchase = await prisma.$transaction(async (tx) => {
    // 1. Buat Purchase
    const purchase = await tx.purchase.create({
      data: {
        code,
        vendorId: data.vendorId,
        userId,
        totalAmount,
        notes: data.notes,
        purchaseDate: new Date(data.purchaseDate),
      },
    })

    // 2. Proses setiap item
    for (const item of data.items) {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: item.productId },
        select: { buyPrice: true },
      })
      const previousBuyPrice = Number(product.buyPrice)
      const priceChanged = previousBuyPrice !== item.buyPrice

      // Buat PurchaseItem
      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: item.quantity,
          buyPrice: item.buyPrice,
          previousBuyPrice: priceChanged ? previousBuyPrice : null,
          priceChanged,
          subtotal: item.quantity * item.buyPrice,
        },
      })

      // Update stok via createMovement
      await createMovement(tx, {
        productId: item.productId,
        type: "PURCHASE_IN",
        quantity: item.quantity,
        referenceCode: code,
        purchaseId: purchase.id,
      })

      // Update harga beli jika dikonfirmasi
      if ((data.confirmedPriceUpdates ?? []).includes(item.productId)) {
        await tx.product.update({
          where: { id: item.productId },
          data: { buyPrice: item.buyPrice },
        })
        log.warn("[PURCHASE]", "Buy price updated", {
          productId: item.productId,
          previousBuyPrice,
          newBuyPrice: item.buyPrice,
        })
      } else if (priceChanged) {
        log.warn("[PURCHASE]", "Price change detected but not confirmed", {
          productId: item.productId,
          previousBuyPrice,
          newBuyPrice: item.buyPrice,
        })
      }
    }

    return purchase
  })

  log.info("[PURCHASE]", "Purchase created", {
    code,
    vendorId: data.vendorId,
    itemCount: data.items.length,
    totalAmount,
  })

  // Update ProductVendorPrice catalog setelah PO selesai
  const purchaseDate = new Date(data.purchaseDate)
  for (const item of data.items) {
    await updateAfterPurchase(item.productId, data.vendorId, item.buyPrice, purchaseDate)
  }

  return getPurchaseById(purchase.id)
}
