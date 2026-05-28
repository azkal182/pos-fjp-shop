import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/exceptions"
import { calculatePagination } from "@/lib/api-response"

export interface TransactionFilter {
  customerId?: string
  paymentStatus?: string
  confirmationStatus?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export async function getAllTransactions(filter: TransactionFilter = {}) {
  const { customerId, paymentStatus, confirmationStatus, dateFrom, dateTo, page = 1, limit = 20 } = filter

  const where = {
    ...(customerId && { customerId }),
    ...(paymentStatus && { paymentStatus: paymentStatus as any }),
    // Default: hanya tampilkan CONFIRMED (riwayat transaksi selesai)
    // DRAFT ada di /transactions/pending, CANCELLED tidak ditampilkan
    ...(confirmationStatus
      ? { confirmationStatus: confirmationStatus as any }
      : { confirmationStatus: "CONFIRMED" as any }
    ),
    ...((dateFrom || dateTo) && {
      transactionDate: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      },
    }),
  }

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ])

  return { data, meta: calculatePagination(page, limit, total) }
}

export async function getTransactionById(id: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      user: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { id: true, name: true, code: true, unit: true } } },
      },
      debt: {
        include: {
          payments: {
            orderBy: { paymentDate: "desc" },
          },
        },
      },
    },
  })
  if (!transaction) throw new NotFoundError("Transaksi")
  return transaction
}
