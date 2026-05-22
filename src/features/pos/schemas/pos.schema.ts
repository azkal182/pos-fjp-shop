import { z } from "zod"

export const draftItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  sellPrice: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
})

// Schema untuk membuat DRAFT — tanpa paidAmount, tanpa packingFee
export const createDraftSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(draftItemSchema).min(1, "Minimal 1 item"),
  discountAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
})

// Schema untuk konfirmasi DRAFT — dengan paidAmount dan packingFee
export const confirmTransactionSchema = z.object({
  paidAmount: z.number().min(0),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  packingFee: z.number().min(0).default(0),
  overpayAction: z.enum(["return", "deposit"]).optional(),
  depositUsed: z.number().min(0).optional(),
  depositId: z.string().optional(),
  notes: z.string().optional(),
  // Boleh update items saat konfirmasi (qty/harga bisa berubah)
  items: z.array(draftItemSchema).min(1).optional(),
  discountAmount: z.number().min(0).optional(),
})

// Legacy schema — tetap ada untuk backward compat jika diperlukan
export const checkoutItemSchema = draftItemSchema
export const checkoutSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(draftItemSchema).min(1, "Minimal 1 item"),
  paidAmount: z.number().min(0),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  discountAmount: z.number().min(0),
  notes: z.string().optional(),
  overpayAction: z.enum(["return", "deposit"]).optional(),
  depositUsed: z.number().min(0).optional(),
  depositId: z.string().optional(),
})

export type DraftItemInput = z.infer<typeof draftItemSchema>
export type CreateDraftInput = z.infer<typeof createDraftSchema>
export type ConfirmTransactionInput = z.infer<typeof confirmTransactionSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
