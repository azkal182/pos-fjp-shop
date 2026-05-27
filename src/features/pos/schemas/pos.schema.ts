import { z } from "zod"

function hasDuplicateProduct(items: { productId: string }[]) {
  return new Set(items.map((item) => item.productId)).size !== items.length
}

export const draftItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  sellPrice: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0).default(0),
})

// Schema untuk membuat DRAFT — tanpa paidAmount, tanpa packingFee
export const createDraftSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(draftItemSchema).min(1, "Minimal 1 item"),
  discountAmount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (hasDuplicateProduct(data.items)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: "Produk duplikat dalam item transaksi tidak diperbolehkan",
    })
  }
})

// Schema untuk konfirmasi DRAFT — dengan paidAmount dan packingFee
export const confirmTransactionSchema = z.object({
  // paidAmount bisa 0 (hutang semua) — coerce dari string/number
  paidAmount: z.coerce.number().min(0),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  packingFee: z.coerce.number().min(0).default(0),
  overpayAction: z.enum(["return", "deposit"]).optional(),
  depositUsed: z.coerce.number().min(0).optional(),
  depositId: z.string().optional(),
  notes: z.string().optional(),
  // Boleh update items saat konfirmasi (qty/harga bisa berubah)
  items: z.array(draftItemSchema).min(1).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
}).superRefine((data, ctx) => {
  if (data.items && hasDuplicateProduct(data.items)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: "Produk duplikat dalam item transaksi tidak diperbolehkan",
    })
  }
  if ((data.depositUsed ?? 0) > 0 && !data.depositId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["depositId"],
      message: "depositId wajib diisi saat menggunakan deposit",
    })
  }
  if (data.depositId && (data.depositUsed ?? 0) <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["depositUsed"],
      message: "depositUsed harus lebih dari 0 jika depositId diisi",
    })
  }
})

// Legacy schema — tetap ada untuk backward compat jika diperlukan
export const checkoutItemSchema = draftItemSchema
export const checkoutSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(draftItemSchema).min(1, "Minimal 1 item"),
  paidAmount: z.coerce.number().min(0),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  discountAmount: z.coerce.number().min(0),
  notes: z.string().optional(),
  overpayAction: z.enum(["return", "deposit"]).optional(),
  depositUsed: z.coerce.number().min(0).optional(),
  depositId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (hasDuplicateProduct(data.items)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: "Produk duplikat dalam item transaksi tidak diperbolehkan",
    })
  }
  if ((data.depositUsed ?? 0) > 0 && !data.depositId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["depositId"],
      message: "depositId wajib diisi saat menggunakan deposit",
    })
  }
  if (data.depositId && (data.depositUsed ?? 0) <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["depositUsed"],
      message: "depositUsed harus lebih dari 0 jika depositId diisi",
    })
  }
})

export type DraftItemInput = z.infer<typeof draftItemSchema>
export type CreateDraftInput = z.infer<typeof createDraftSchema>
export type ConfirmTransactionInput = z.infer<typeof confirmTransactionSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
