/**
 * POST /api/upload
 * Upload gambar ke Cloudflare R2.
 *
 * Body: multipart/form-data
 *   - file: File (image/*)
 *   - folder: string (opsional, default "uploads") — e.g. "logos", "products"
 *
 * Response: { success: true, data: { url: string, key: string } }
 */
import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { uploadToR2, deleteFromR2, extractR2Key } from "@/lib/r2"
import { randomUUID } from "crypto"
import path from "path"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export const POST = withHandler(async (req: NextRequest) => {
  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const folder = (formData.get("folder") as string | null) ?? "uploads"
  const replaceUrl = formData.get("replaceUrl") as string | null // URL lama untuk dihapus

  if (!file) throw new ValidationError("File tidak ditemukan")
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ValidationError(`Tipe file tidak didukung. Gunakan: ${ALLOWED_TYPES.join(", ")}`)
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new ValidationError(`Ukuran file maksimal 5 MB`)
  }

  // Sanitize folder name
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50) || "uploads"

  // Generate unique key
  const ext = path.extname(file.name).toLowerCase() || `.${file.type.split("/")[1]}`
  const key = `${safeFolder}/${randomUUID()}${ext}`

  // Baca file sebagai buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Hapus file lama jika ada
  if (replaceUrl) {
    const oldKey = extractR2Key(replaceUrl)
    if (oldKey) {
      try { await deleteFromR2(oldKey) } catch { /* abaikan jika gagal */ }
    }
  }

  // Upload ke R2
  const url = await uploadToR2(key, buffer, file.type)

  return successResponse({ url, key })
})
