/**
 * Server-only: generate kode sequential per hari per prefix.
 * File ini menggunakan Prisma — JANGAN import di client components.
 *
 * Format: PREFIX-YYYYMMDD-XXXX (4 digit, reset tiap hari)
 * Contoh: TRX-20260522-0001, PO-20260522-0042
 */
import { prisma } from "@/lib/prisma"

export async function generateSequentialCode(prefix: string): Promise<string> {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "")

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
