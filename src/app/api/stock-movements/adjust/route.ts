import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError, NotFoundError } from "@/lib/exceptions"
import { prisma } from "@/lib/prisma"
import { createMovement } from "@/features/stock-movements/services/stock-movement.service"
import { stockAdjustmentSchema } from "@/features/stock-movements/schemas"
import { log } from "@/lib/logger"

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json()
  const parsed = stockAdjustmentSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message)

  const { productId, type, quantity, notes } = parsed.data

  // Validasi produk ada dan aktif
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, code: true, stock: true, isActive: true },
  })
  if (!product) throw new NotFoundError("Produk")

  // Validasi stok tidak negatif untuk ADJUSTMENT_OUT
  if (type === "ADJUSTMENT_OUT" && product.stock < quantity) {
    throw new ValidationError(
      `Stok tidak cukup. Stok saat ini: ${product.stock}, pengurangan: ${quantity}`
    )
  }

  const actualQty = type === "ADJUSTMENT_OUT" ? -quantity : quantity

  const movement = await prisma.$transaction(async (tx) => {
    await createMovement(tx, {
      productId,
      type,
      quantity: actualQty,
      notes,
    })

    return tx.stockMovement.findFirst({
      where: { productId, type },
      orderBy: { createdAt: "desc" },
      include: { product: { select: { id: true, name: true, code: true, unit: true, stock: true } } },
    })
  })

  log.info("[STOCK]", "Manual adjustment created", {
    productId,
    productName: product.name,
    type,
    quantity: actualQty,
    notes,
  })

  return successResponse(movement, 201)
})
