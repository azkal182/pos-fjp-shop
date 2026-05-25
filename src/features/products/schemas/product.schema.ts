import { z } from "zod"

export const createProductSchema = z
  .object({
    code: z.string().min(1, "Kode wajib diisi").max(50, "Kode maksimal 50 karakter").trim(),
    name: z.string().min(1, "Nama wajib diisi").max(200, "Nama maksimal 200 karakter").trim(),
    categoryId: z.string().min(1, "Kategori wajib dipilih"),
    vendorId: z.string().min(1, "Vendor wajib dipilih"),  // vendor utama produk, wajib saat create
    unit: z.string().min(1, "Satuan wajib diisi").trim(),
    buyPrice: z.number().min(0, "Harga beli tidak boleh negatif"),
    sellPrice: z.number().min(0, "Harga jual tidak boleh negatif"),
    minStock: z.number().int().min(0, "Min stok tidak boleh negatif"),
    isActive: z.boolean(),
  })
  .refine((data) => data.sellPrice >= data.buyPrice, {
    message: "Harga jual sebaiknya tidak lebih rendah dari harga beli",
    path: ["sellPrice"],
  })

// Schema khusus edit — vendorId tidak ada (tidak bisa ganti vendor utama via edit)
export const editProductSchema = z
  .object({
    code: z.string().min(1, "Kode wajib diisi").max(50, "Kode maksimal 50 karakter").trim(),
    name: z.string().min(1, "Nama wajib diisi").max(200, "Nama maksimal 200 karakter").trim(),
    categoryId: z.string().min(1, "Kategori wajib dipilih"),
    unit: z.string().min(1, "Satuan wajib diisi").trim(),
    buyPrice: z.number().min(0, "Harga beli tidak boleh negatif"),
    sellPrice: z.number().min(0, "Harga jual tidak boleh negatif"),
    minStock: z.number().int().min(0, "Min stok tidak boleh negatif"),
    isActive: z.boolean(),
  })
  .refine((data) => data.sellPrice >= data.buyPrice, {
    message: "Harga jual sebaiknya tidak lebih rendah dari harga beli",
    path: ["sellPrice"],
  })

export const updateProductSchema = z
  .object({
    code: z.string().min(1).max(50).trim().optional(),
    name: z.string().min(1).max(200).trim().optional(),
    categoryId: z.string().min(1).optional(),
    vendorId: z.string().min(1).optional(),
    unit: z.string().min(1).trim().optional(),
    buyPrice: z.number().min(0).optional(),
    sellPrice: z.number().min(0).optional(),
    minStock: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.sellPrice !== undefined && data.buyPrice !== undefined) {
        return data.sellPrice >= data.buyPrice
      }
      return true
    },
    {
      message: "Harga jual sebaiknya tidak lebih rendah dari harga beli",
      path: ["sellPrice"],
    }
  )

export type CreateProductInput = z.infer<typeof createProductSchema>
export type EditProductInput = z.infer<typeof editProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
