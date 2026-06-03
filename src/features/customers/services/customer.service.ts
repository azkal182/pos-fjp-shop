import { prisma } from "@/lib/prisma"
import { ConflictError, NotFoundError } from "@/lib/exceptions"
import { calculatePagination } from "@/lib/api-response"
import { differenceInDays, subDays } from "date-fns"
import { endOfDayWIB, formatDateWIB, parseDateWIB, startOfDayWIB } from "@/lib/timezone"
import type { CreateCustomerInput, UpdateCustomerInput } from "../schemas/customer.schema"

export interface CustomerFilter {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}

export async function getAllCustomers(filter: CustomerFilter = {}) {
  const { search, isActive, page = 1, limit = 20 } = filter

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(isActive !== undefined && { isActive }),
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        _count: { select: { debts: true } },
        debts: {
          where: { status: { in: ["UNPAID", "PARTIAL"] } },
          select: { remainingAmount: true },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ])

  // Hitung total outstanding per customer
  const data = customers.map((c) => ({
    ...c,
    totalOutstanding: c.debts.reduce(
      (sum, d) => sum + Number(d.remainingAmount),
      0
    ),
  }))

  return { data, meta: calculatePagination(page, limit, total) }
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
        select: {
          id: true,
          code: true,
          totalAmount: true,
          paidAmount: true,
          paymentStatus: true,
          transactionDate: true,
        },
      },
      debts: {
        where: { status: { in: ["UNPAID", "PARTIAL"] } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          originalAmount: true,
          remainingAmount: true,
          status: true,
          debtDate: true,
          transaction: { select: { code: true } },
        },
      },
    },
  })
  if (!customer) throw new NotFoundError("Customer")
  return customer
}

export async function createCustomer(data: CreateCustomerInput) {
  return prisma.customer.create({ data })
}

export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  await getCustomerById(id)
  return prisma.customer.update({ where: { id }, data })
}

export async function softDeleteCustomer(id: string) {
  const customer = await getCustomerById(id)

  const activeDebts = customer.debts.length
  if (activeDebts > 0) {
    throw new ConflictError(
      `Customer tidak bisa dinonaktifkan karena masih memiliki ${activeDebts} hutang aktif`
    )
  }

  return prisma.customer.update({ where: { id }, data: { isActive: false } })
}

export async function getCustomerDebtSummary(customerId: string) {
  const debts = await prisma.debt.findMany({
    where: { customerId, status: { in: ["UNPAID", "PARTIAL"] } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      originalAmount: true,
      remainingAmount: true,
      status: true,
      debtDate: true,
      transaction: { select: { code: true } },
    },
  })

  const totalOutstanding = debts.reduce(
    (sum, d) => sum + Number(d.remainingAmount),
    0
  )

  const oldestDebt = debts[0]
  const oldestDays = oldestDebt
    ? differenceInDays(new Date(), new Date(oldestDebt.debtDate))
    : null

  return {
    totalOutstanding,
    activeDebtsCount: debts.length,
    oldestDays,
    debts,
  }
}

export interface CustomerProductHistoryParams {
  customerId: string
  dateFrom?: string
  dateTo?: string
}

export interface CustomerProductHistoryRow {
  id: string
  transactionId: string
  transactionCode: string
  date: Date
  type: "ITEM" | "PACKING" | "TRANSACTION_DISCOUNT"
  productName: string
  productCode?: string | null
  quantity: number | null
  unit: string | null
  price: number | null
  total: number
}

export interface CustomerProductHistoryReport {
  customer: {
    id: string
    name: string
    phone: string | null
    address: string | null
  }
  dateFrom: string
  dateTo: string
  transactionsCount: number
  rows: CustomerProductHistoryRow[]
  summary: {
    itemSubtotal: number
    packingFee: number
    transactionDiscount: number
    grandTotal: number
    totalQuantity: number
  }
}

export async function getCustomerProductHistoryReport({
  customerId,
  dateFrom,
  dateTo,
}: CustomerProductHistoryParams): Promise<CustomerProductHistoryReport> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, phone: true, address: true },
  })
  if (!customer) throw new NotFoundError("Customer")

  const fallbackTo = new Date()
  const fallbackFrom = subDays(fallbackTo, 29)
  const from = dateFrom ? parseDateWIB(dateFrom) : fallbackFrom
  const to = dateTo ? parseDateWIB(dateTo) : fallbackTo

  const transactions = await prisma.transaction.findMany({
    where: {
      customerId,
      confirmationStatus: "CONFIRMED",
      transactionDate: {
        gte: startOfDayWIB(from),
        lte: endOfDayWIB(to),
      },
    },
    include: {
      items: {
        include: {
          product: {
            select: { code: true, unit: true },
          },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
    orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  })

  const rows: CustomerProductHistoryRow[] = []
  let itemSubtotal = 0
  let packingFee = 0
  let transactionDiscount = 0
  let grandTotal = 0
  let totalQuantity = 0

  for (const trx of transactions) {
    for (const item of trx.items) {
      const quantity = Number(item.quantity)
      const itemDiscount = Number(item.discountAmount)
      const netPrice = Number(item.sellPrice) - itemDiscount
      const total = Number(item.subtotal)
      itemSubtotal += total
      totalQuantity += quantity

      rows.push({
        id: item.id,
        transactionId: trx.id,
        transactionCode: trx.code,
        date: trx.transactionDate,
        type: "ITEM",
        productName: item.productName,
        productCode: item.product?.code ?? null,
        quantity,
        unit: item.product?.unit ?? null,
        price: netPrice,
        total,
      })
    }

    const trxPackingFee = Number(trx.packingFee)
    if (trxPackingFee > 0) {
      packingFee += trxPackingFee
      rows.push({
        id: `${trx.id}-packing`,
        transactionId: trx.id,
        transactionCode: trx.code,
        date: trx.transactionDate,
        type: "PACKING",
        productName: "Biaya Packing",
        quantity: null,
        unit: null,
        price: null,
        total: trxPackingFee,
      })
    }

    const trxDiscount = Number(trx.discountAmount)
    if (trxDiscount > 0) {
      transactionDiscount += trxDiscount
      rows.push({
        id: `${trx.id}-discount`,
        transactionId: trx.id,
        transactionCode: trx.code,
        date: trx.transactionDate,
        type: "TRANSACTION_DISCOUNT",
        productName: "Diskon Transaksi",
        quantity: null,
        unit: null,
        price: null,
        total: -trxDiscount,
      })
    }

    grandTotal += Number(trx.totalAmount)
  }

  return {
    customer,
    dateFrom: formatDateWIB(startOfDayWIB(from)),
    dateTo: formatDateWIB(startOfDayWIB(to)),
    transactionsCount: transactions.length,
    rows,
    summary: {
      itemSubtotal,
      packingFee,
      transactionDiscount,
      grandTotal,
      totalQuantity,
    },
  }
}
