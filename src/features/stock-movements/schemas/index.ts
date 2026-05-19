import { z } from "zod"

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  type: z.enum(["ADJUSTMENT_IN", "ADJUSTMENT_OUT"], {
    error: "Tipe penyesuaian tidak valid",
  }),
  quantity: z.number().int().min(1, "Qty minimal 1"),
  notes: z.string().min(1, "Alasan penyesuaian wajib diisi").max(500),
})

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
