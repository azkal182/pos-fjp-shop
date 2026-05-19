import { z } from "zod"

export const createUserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(200).trim(),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  email: z.string().email().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
