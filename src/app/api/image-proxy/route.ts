/**
 * GET /api/image-proxy?url=https://...
 * Fetch gambar dari URL eksternal (R2) di server dan kembalikan sebagai base64.
 * Server-side fetch tidak kena CORS restriction.
 */
import { type NextRequest, NextResponse } from "next/server"

// Whitelist domain yang boleh di-proxy
const ALLOWED_HOSTNAMES = [
  "r2.dev",
  "cloudflare.com",
  "cloudflareresearch.com",
]

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:") return false
    return ALLOWED_HOSTNAMES.some((d) => parsed.hostname.endsWith(d))
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.json({ success: false, error: "Parameter url wajib diisi" }, { status: 400 })
  }

  if (!isAllowedUrl(url)) {
    return NextResponse.json({ success: false, error: "URL tidak diizinkan" }, { status: 403 })
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "POS-FJP-PDF-Generator/1.0" },
    })

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Gagal fetch gambar: HTTP ${res.status}` },
        { status: 502 }
      )
    }

    const contentType = res.headers.get("content-type") ?? "image/png"
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Bukan file gambar" }, { status: 400 })
    }

    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    const dataUri = `data:${contentType};base64,${base64}`

    return NextResponse.json(
      { success: true, data: { dataUri, contentType } },
      {
        headers: {
          // Cache di browser 1 jam
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error: `Fetch error: ${message}` },
      { status: 500 }
    )
  }
}
