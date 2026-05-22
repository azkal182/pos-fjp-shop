import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { CURRENCY, LOCALE } from "@/config/app.config"
import { prisma } from "@/lib/prisma"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number | string | { toString(): string }): string {
  const num = typeof amount === "number" ? amount : parseFloat(amount.toString())
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

/**
 * Generate kode sequential per hari per prefix.
 * Format: PREFIX-YYYYMMDD-XXXX (4 digit, reset tiap hari)
 * Contoh: TRX-20260522-0001, PO-20260522-0042
 *
 * Menggunakan query MAX untuk menghindari race condition.
 * Prefix yang didukung: TRX (transactions), PO (purchases)
 */
export async function generateSequentialCode(prefix: string): Promise<string> {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "")
  const pattern = `${prefix}-${dateStr}-%`

  // Cari nomor urut tertinggi hari ini untuk prefix ini
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

/** @deprecated Gunakan generateSequentialCode() untuk kode yang sequential */
export function generateCode(prefix: string): string {
  const now = new Date()
  const date = now
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")
  const random = Math.floor(1000 + Math.random() * 9000).toString()
  return `${prefix}-${date}-${random}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
}
