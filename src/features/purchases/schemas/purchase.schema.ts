import { z } from "zod"

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  quantity: z.number().int().min(1, "Qty minimal 1"),
  buyPrice: z.number().min(0, "Harga beli tidak boleh negatif"),
})

export const createPurchaseSchema = z.object({
  vendorId: z.string().min(1, "Vendor wajib dipilih"),
  purchaseDate: z.string().min(1, "Tanggal wajib diisi"),
  items: z.array(purchaseItemSchema).min(1, "Minimal 1 item"),
  notes: z.string().optional(),
  confirmedPriceUpdates: z.array(z.string()).optional(),
})

export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>

export interface PriceChange {
  productId: string
  productName: string
  productCode: string
  previousBuyPrice: number
  newBuyPrice: number
  changed: boolean
}
