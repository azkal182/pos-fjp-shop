/**
 * GET /api/image-proxy?url=https://...
 * Fetch gambar dari URL eksternal (R2, dll) di server dan kembalikan sebagai base64.
 * Dipakai untuk embed logo di PDF yang di-generate di browser,
 * menghindari masalah CORS karena R2 tidak set CORS header.
 */
import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"

// Whitelist domain yang boleh di-proxy — hanya R2 dan domain terpercaya
const ALLOWED_DOMAINS = [
  "r2.dev",
  "pub-",  // Cloudflare R2 public URL prefix
  "cloudflare",
]

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Hanya HTTPS
    if (parsed.protocol !== "https:") return false
    // Cek domain whitelist
    return ALLOWED_DOMAINS.some((d) => parsed.hostname.includes(d))
  } catch {
    return false
  }
}

export const GET = withHandler(async (req: NextRequest) => {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) throw new ValidationError("Parameter url wajib diisi")
  if (!isAllowedUrl(url)) throw new ValidationError("URL tidak diizinkan")

  const res = await fetch(url, {
    headers: { "User-Agent": "POS-FJP-PDF-Generator/1.0" },
    // Cache di server selama 1 jam
    next: { revalidate: 3600 },
  })

  if (!res.ok) throw new ValidationError(`Gagal fetch gambar: ${res.status}`)

  const contentType = res.headers.get("content-type") ?? "image/png"
  if (!contentType.startsWith("image/")) throw new ValidationError("Bukan file gambar")

  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString("base64")
  const dataUri = `data:${contentType};base64,${base64}`

  return successResponse({ dataUri, contentType })
})
