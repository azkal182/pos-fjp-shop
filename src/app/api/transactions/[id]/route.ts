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
  quantity: z.number().int().min(1),
  sellPrice: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
})

const updateDraftSchema = z.object({
  items: z.array(updateDraftItemSchema).min(1, "Minimal 1 item"),
  discountAmount: z.number().min(0).default(0),
})

// PATCH /api/transactions/:id — update items draft (sebelum konfirmasi)
export const PATCH = withHandler(async (req: NextRequest, ctx) => {
  const session = await auth.api.getSession({ headers: req.headers })
  const userId = session!.user.id

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

  await prisma.$transaction(async (tx) => {
    // Lepas semua reserved stock lama
    for (const item of existing.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { reservedStock: { decrement: item.quantity } },
      })
    }

    // Validasi stok baru
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true, reservedStock: true, name: true, isActive: true },
      })
      if (!product || !product.isActive) throw new ValidationError(`Produk tidak ditemukan`)
      const available = product.stock - product.reservedStock
      if (available < item.quantity) {
        throw new ValidationError(
          `Stok ${product.name} tidak cukup. Tersedia: ${available}, diminta: ${item.quantity}`
        )
      }
    }

    // Hapus items lama, buat items baru
    await tx.transactionItem.deleteMany({ where: { transactionId: id } })

    const subtotal = items.reduce(
      (s, i) => s + (i.sellPrice - i.discountAmount) * i.quantity, 0
    )
    const totalAmount = subtotal - discountAmount

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
      // Reserve stok baru
      await tx.product.update({
        where: { id: item.productId },
        data: { reservedStock: { increment: item.quantity } },
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
