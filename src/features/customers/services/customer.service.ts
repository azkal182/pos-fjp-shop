import { prisma } from "@/lib/prisma"
import { ConflictError, NotFoundError } from "@/lib/exceptions"
import { calculatePagination } from "@/lib/api-response"
import { differenceInDays } from "date-fns"
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
