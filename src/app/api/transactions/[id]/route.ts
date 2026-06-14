import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError, ConflictError, NotFoundError } from "@/lib/exceptions"
import { auth } from "@/lib/auth"
import { getTransactionById } from "@/features/transactions/services/transaction.service"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params!
  const transaction = await getTransactionById(id)
  return successResponse(transaction)
})

const updateDraftItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  sellPrice: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0).default(0),
})

const updateDraftSchema = z.object({
  items: z.array(updateDraftItemSchema).min(1, "Minimal 1 item"),
  discountAmount: z.coerce.number().min(0).default(0),
}).superRefine((data, ctx) => {
  const isDuplicate = new Set(data.items.map((item) => item.productId)).size !== data.items.length
  if (isDuplicate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: "Produk duplikat dalam item transaksi tidak diperbolehkan",
    })
  }
})

// PATCH /api/transactions/:id — update items draft (sebelum konfirmasi)
export const PATCH = withHandler(async (req: NextRequest, ctx) => {
  const session = await auth.api.getSession({ headers: req.headers })
  void session

  const { id } = await ctx.params!
  const body = await req.json()
  const parsed = updateDraftSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)

  const existing = await prisma.transaction.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!existing) throw new NotFoundError("Transaksi")
  if (existing.confirmationStatus !== "DRAFT") {
    throw new ConflictError("Hanya transaksi DRAFT yang bisa diupdate")
  }

  const { items, discountAmount } = parsed.data
  for (const item of items) {
    if (item.discountAmount > item.sellPrice) {
      throw new ValidationError("Diskon item tidak boleh melebihi harga jual")
    }
  }

  await prisma.$transaction(async (tx) => {
    const oldQty = new Map<string, number>()
    const newQty = new Map<string, number>()
    for (const it of existing.items) {
      oldQty.set(it.productId, (oldQty.get(it.productId) ?? 0) + it.quantity)
    }
    for (const it of items) {
      newQty.set(it.productId, (newQty.get(it.productId) ?? 0) + it.quantity)
    }

    // Validasi produk aktif dulu
    const productIds = Array.from(new Set(items.map((i) => i.productId)))
    for (const productId of productIds) {
      const p = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, isActive: true },
      })
      if (!p || !p.isActive) throw new ValidationError(`Produk tidak ditemukan`)
    }

    // Terapkan delta reserve secara atomik per produk:
    // delta > 0: tambah reserve dengan syarat stok tersedia
    // delta < 0: kurangi reserve
    const allProductIds = new Set([...oldQty.keys(), ...newQty.keys()])
    for (const productId of allProductIds) {
      const before = oldQty.get(productId) ?? 0
      const after = newQty.get(productId) ?? 0
      const delta = after - before
      if (delta > 0) {
        const updated = await tx.$executeRawUnsafe<number>(
          `UPDATE "products"
           SET "reservedStock" = "reservedStock" + $1
           WHERE "id" = $2
             AND ("stock" - "reservedStock") >= $1`,
          delta,
          productId
        )
        if (updated === 0) {
          const product = await tx.product.findUnique({ where: { id: productId }, select: { name: true } })
          throw new ValidationError(`Stok ${product?.name ?? productId} tidak cukup untuk update draft`)
        }
      } else if (delta < 0) {
        await tx.product.update({
          where: { id: productId },
          data: { reservedStock: { decrement: Math.abs(delta) } },
        })
      }
    }

    // Hapus items lama, buat items baru
    await tx.transactionItem.deleteMany({ where: { transactionId: id } })

    const subtotal = items.reduce(
      (s, i) => s + (i.sellPrice - i.discountAmount) * i.quantity, 0
    )
    if (discountAmount > subtotal) {
      throw new ValidationError("Diskon order tidak boleh melebihi subtotal produk")
    }
    const totalAmount = subtotal - discountAmount
    if (totalAmount <= 0) {
      throw new ValidationError("Total transaksi harus lebih dari 0")
    }

    for (const item of items) {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: item.productId },
        select: { name: true, buyPrice: true },
      })
      await tx.transactionItem.create({
        data: {
          transactionId: id,
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          sellPrice: item.sellPrice,
          buyPrice: product.buyPrice,
          discountAmount: item.discountAmount,
          subtotal: (item.sellPrice - item.discountAmount) * item.quantity,
        },
      })
    }

    // Update transaction totals
    await tx.transaction.update({
      where: { id },
      data: { subtotal, discountAmount, totalAmount, updatedAt: new Date() },
    })
  })

  const updated = await getTransactionById(id)
  return successResponse(updated)
})
