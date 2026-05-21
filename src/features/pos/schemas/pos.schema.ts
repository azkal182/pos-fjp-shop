import { z } from "zod"

export const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  sellPrice: z.number().min(0),
  discountAmount: z.number().min(0),
})

export const checkoutSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(checkoutItemSchema).min(1, "Minimal 1 item"),
  paidAmount: z.number().min(0),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  discountAmount: z.number().min(0),
  notes: z.string().optional(),
  overpayAction: z.enum(["return", "deposit"]).optional(), // apa yang dilakukan dengan kelebihan bayar
  depositUsed: z.number().min(0).optional(), // deposit yang dipakai
  depositId: z.string().optional(), // id deposit yang dipakai
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
