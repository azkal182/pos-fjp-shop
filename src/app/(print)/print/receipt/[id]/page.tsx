/**
 * /print/receipt/[id]
 * Halaman cetak nota thermal — bersih tanpa dashboard layout.
 * Buka di tab baru, lalu window.print() otomatis.
 */
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getStoreSettings, getPrinterSettings } from "@/features/settings/services/settings.service"
import { ThermalReceipt } from "@/features/pos/components/ThermalReceipt"

interface Props {
  params: Promise<{ id: string }>
}

export default async function PrintReceiptPage({ params }: Props) {
  const { id } = await params

  const [transaction, storeSettings, printerSettings] = await Promise.all([
    prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: {
          include: { product: { select: { code: true } } },
          orderBy: { createdAt: "asc" },
        },
        user: { select: { name: true } },
      },
    }),
    getStoreSettings(),
    getPrinterSettings(),
  ])

  if (!transaction || transaction.confirmationStatus !== "CONFIRMED") {
    notFound()
  }

  return (
    <ThermalReceipt
      transaction={transaction as any}
      storeSettings={storeSettings}
      logoUrl={storeSettings.logoUrl || null}
      receiptWidth={printerSettings.receiptWidth}
    />
  )
}
