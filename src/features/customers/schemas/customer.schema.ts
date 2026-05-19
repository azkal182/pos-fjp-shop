import { z } from "zod"

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(200).trim(),
  phone: z.string().max(20).trim().optional(),
  address: z.string().max(500).trim().optional(),
  isActive: z.boolean(),
})

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  phone: z.string().max(20).trim().optional().nullable(),
  address: z.string().max(500).trim().optional().nullable(),
  isActive: z.boolean().optional(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
