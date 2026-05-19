import { z } from "zod"

export const createAgingCategorySchema = z
  .object({
    name: z.string().min(1, "Nama wajib diisi").max(100).trim(),
    minDays: z.number().int().min(0, "Min hari tidak boleh negatif"),
    maxDays: z.number().int().min(1).nullable().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Format warna harus hex (#RRGGBB)"),
    order: z.number().int().min(1, "Urutan minimal 1"),
  })
  .refine(
    (data) => {
      if (data.maxDays != null) return data.maxDays > data.minDays
      return true
    },
    { message: "Max hari harus lebih besar dari min hari", path: ["maxDays"] }
  )

export const updateAgingCategorySchema = z
  .object({
    name: z.string().min(1).max(100).trim().optional(),
    minDays: z.number().int().min(0).optional(),
    maxDays: z.number().int().min(1).nullable().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    order: z.number().int().min(1).optional(),
  })

export const debtPaymentSchema = z.object({
  customerId: z.string().min(1, "Customer wajib dipilih"),
  amount: z.number().min(1, "Nominal minimal Rp 1"),
  notes: z.string().optional(),
})

export type CreateAgingCategoryInput = z.infer<typeof createAgingCategorySchema>
export type UpdateAgingCategoryInput = z.infer<typeof updateAgingCategorySchema>
export type DebtPaymentInput = z.infer<typeof debtPaymentSchema>
