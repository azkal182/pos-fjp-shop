import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { CURRENCY, LOCALE } from "@/config/app.config"

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
