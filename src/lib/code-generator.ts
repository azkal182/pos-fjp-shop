/**
 * Server-only: generate kode sequential per hari per prefix.
 * File ini menggunakan Prisma — JANGAN import di client components.
 *
 * Format: PREFIX-YYYYMMDD-XXXX (4 digit, reset tiap hari)
 * Contoh: TRX-20260522-0001, PO-20260522-0042
 *
 * Tanggal menggunakan WIB (UTC+7) agar kode sesuai hari kalender Indonesia.
 */
import { prisma } from "@/lib/prisma"

/** Kembalikan tanggal dalam format YYYYMMDD berdasarkan timezone WIB (UTC+7) */
function getWIBDateStr(): string {
  const now = new Date()
  // Offset WIB = UTC+7 = 7 * 60 * 60 * 1000 ms
  const wibOffset = 7 * 60 * 60 * 1000
  const wibDate = new Date(now.getTime() + wibOffset)
  // toISOString() sekarang mengembalikan waktu WIB dalam format UTC string
  return wibDate.toISOString().slice(0, 10).replace(/-/g, "")
}

export async function generateSequentialCode(prefix: string): Promise<string> {
  const dateStr = getWIBDateStr()

  let maxSeq = 0

  if (prefix === "TRX") {
    const result = await prisma.transaction.findFirst({
      where: { code: { startsWith: `${prefix}-${dateStr}-` } },
      orderBy: { code: "desc" },
      select: { code: true },
    })
    if (result?.code) {
      const parts = result.code.split("-")
      maxSeq = parseInt(parts[parts.length - 1]) || 0
    }
  } else if (prefix === "PO") {
    const result = await prisma.purchase.findFirst({
      where: { code: { startsWith: `${prefix}-${dateStr}-` } },
      orderBy: { code: "desc" },
      select: { code: true },
    })
    if (result?.code) {
      const parts = result.code.split("-")
      maxSeq = parseInt(parts[parts.length - 1]) || 0
    }
  }

  const nextSeq = (maxSeq + 1).toString().padStart(4, "0")
  return `${prefix}-${dateStr}-${nextSeq}`
}
