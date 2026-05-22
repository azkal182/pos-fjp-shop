/**
 * /print/receipt/[id]
 * Halaman cetak nota thermal — bersih tanpa dashboard layout.
 * Buka di tab baru, lalu window.print() otomatis.
 */
export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getStoreSettings, getPrinterSettings } from "@/features/settings/services/settings.service"
import { ThermalReceipt } from "@/features/pos/components/ThermalReceipt"
import type { ReceiptTransaction } from "@/features/pos/components/ReceiptContent"

interface Props {
  params: Promise<{ id: string }>
}

export default async function PrintReceiptPage({ params }: Props) {
  const { id } = await params

  const [raw, storeSettings, printerSettings] = await Promise.all([
    prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            productName: true,
            quantity: true,
            sellPrice: true,
            discountAmount: true,
            subtotal: true,
          },
        },
        user: { select: { name: true } },
      },
    }),
    getStoreSettings(),
    getPrinterSettings(),
  ])

  if (!raw || raw.confirmationStatus !== "CONFIRMED") {
    notFound()
  }

  // Serialize Decimal → number agar bisa di-pass ke Client Component
  const transaction: ReceiptTransaction = {
    id: raw.id,
    code: raw.code,
    subtotal:       Number(raw.subtotal),
    discountAmount: Number(raw.discountAmount),
    packingFee:     Number(raw.packingFee ?? 0),
    totalAmount:    Number(raw.totalAmount),
    paidAmount:     Number(raw.paidAmount),
    changeAmount:   Number(raw.changeAmount),
    debtAmount:     Number(raw.debtAmount),
    paymentMethod:  raw.paymentMethod,
    paymentStatus:  raw.paymentStatus,
    transactionDate: raw.transactionDate.toISOString(),
    customer: raw.customer
      ? { name: raw.customer.name, phone: raw.customer.phone ?? null }
      : null,
    user: { name: raw.user.name },
    items: raw.items.map((item) => ({
      id:             item.id,
      productName:    item.productName,
      quantity:       item.quantity,
      sellPrice:      Number(item.sellPrice),
      discountAmount: Number(item.discountAmount),
      subtotal:       Number(item.subtotal),
    })),
  }

  return (
    <ThermalReceipt
      transaction={transaction}
      storeSettings={storeSettings}
      logoUrl={storeSettings.logoUrl || null}
      receiptWidth={printerSettings.receiptWidth}
    />
  )
}
