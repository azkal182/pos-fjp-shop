import type { PrismaClient } from "@/generated/prisma"
import { prisma as globalPrisma } from "@/lib/prisma"
import { log } from "@/lib/logger"
import { addEntry } from "@/features/ledger/services/ledger.service"
import { subDays } from "date-fns"
import { endOfDayWIB, formatDateWIB, parseDateWIB, startOfDayWIB } from "@/lib/timezone"
import { NotFoundError } from "@/lib/exceptions"
import type { AllocationResult, DebtAllocation, FifoPreview } from "../types/debt.types"

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>

export async function getTotalOutstanding(customerId: string): Promise<number> {
  const result = await globalPrisma.debt.aggregate({
    where: { customerId, status: { in: ["UNPAID", "PARTIAL"] } },
    _sum: { remainingAmount: true },
  })
  return Number(result._sum.remainingAmount ?? 0)
}

export async function hasOutstandingDebt(customerId: string): Promise<boolean> {
  const count = await globalPrisma.debt.count({
    where: { customerId, status: { in: ["UNPAID", "PARTIAL"] } },
  })
  return count > 0
}

export async function getOutstandingDebts(customerId: string) {
  return globalPrisma.debt.findMany({
    where: { customerId, status: { in: ["UNPAID", "PARTIAL"] } },
    orderBy: { debtDate: "asc" },
    include: { transaction: { select: { code: true } } },
  })
}

export async function previewFifoAllocation(
  customerId: string,
  totalPayment: number
): Promise<FifoPreview> {
  const debts = await getOutstandingDebts(customerId)

  let remaining = totalPayment
  const allocations: DebtAllocation[] = []

  for (const debt of debts) {
    if (remaining <= 0) break
    const currentRemaining = Number(debt.remainingAmount)
    const allocatedAmount = Math.min(remaining, currentRemaining)
    const willBeFullyPaid = allocatedAmount >= currentRemaining

    allocations.push({
      debtId: debt.id,
      debtCode: debt.transaction.code,
      debtDate: debt.debtDate,
      originalAmount: Number(debt.originalAmount),
      currentRemaining,
      allocatedAmount,
      willBeFullyPaid,
      remainingAfter: willBeFullyPaid ? 0 : currentRemaining - allocatedAmount,
    })

    remaining -= allocatedAmount
  }

  return {
    allocations,
    totalAllocated: totalPayment - remaining,
    remainingChange: remaining,
  }
}

export async function allocatePaymentFifo(
  customerId: string,
  totalPayment: number,
  sourceTransactionId?: string,
  notes?: string,
  tx?: TxClient,
  createdBy?: string  // jika diisi → tulis LedgerEntry PAYMENT_IN; jika kosong (POS) → skip (POS sudah tulis sendiri)
): Promise<AllocationResult & { customerPaymentId: string }> {
  const db = tx ?? globalPrisma

  const debts = await db.debt.findMany({
    where: { customerId, status: { in: ["UNPAID", "PARTIAL"] } },
    orderBy: { debtDate: "asc" },
    include: { transaction: { select: { code: true } } },
  })

  const source = sourceTransactionId ? "POS_OVERPAYMENT" : "DIRECT"

  log.info("[DEBT]", "FIFO allocation started", {
    customerId,
    totalPayment,
    source,
    debtsCount: debts.length,
  })

  // 1. Buat CustomerPayment header — 1 record per event bayar
  const customerPayment = await db.customerPayment.create({
    data: {
      customerId,
      amount: totalPayment,
      source,
      notes: notes ?? null,
      sourceTransactionId: sourceTransactionId ?? null,
    },
  })

  let remaining = totalPayment
  const allocations: DebtAllocation[] = []

  // 2. Alokasi FIFO ke hutang-hutang
  for (const debt of debts) {
    if (remaining <= 0) break

    const currentRemaining = Number(debt.remainingAmount)
    const allocatedAmount = Math.min(remaining, currentRemaining)
    const willBeFullyPaid = allocatedAmount >= currentRemaining

    allocations.push({
      debtId: debt.id,
      debtCode: debt.transaction.code,
      debtDate: debt.debtDate,
      originalAmount: Number(debt.originalAmount),
      currentRemaining,
      allocatedAmount,
      willBeFullyPaid,
      remainingAfter: willBeFullyPaid ? 0 : currentRemaining - allocatedAmount,
    })

    // Buat DebtPayment — linked ke CustomerPayment header
    await db.debtPayment.create({
      data: {
        debtId: debt.id,
        amount: allocatedAmount,
        source,
        sourceTransactionId: sourceTransactionId ?? null,
        notes: notes ?? null,
        customerPaymentId: customerPayment.id,
      },
    })

    // Update Debt
    await db.debt.update({
      where: { id: debt.id },
      data: {
        paidAmount: { increment: allocatedAmount },
        remainingAmount: { decrement: allocatedAmount },
        status: willBeFullyPaid ? "PAID" : "PARTIAL",
        settledAt: willBeFullyPaid ? new Date() : null,
      },
    })

    log.info("[DEBT]", "Allocated to debt", {
      debtId: debt.id,
      debtCode: debt.transaction.code,
      allocatedAmount,
      willBeFullyPaid,
      customerPaymentId: customerPayment.id,
    })

    remaining -= allocatedAmount
  }

  // Tulis LedgerEntry PAYMENT_IN CREDIT hanya jika createdBy diisi
  // (manual payment). Untuk POS overpay, ledger sudah ditulis di pos.service.ts
  // sebelum memanggil fungsi ini — tidak boleh double entry.
  if (createdBy) {
    await addEntry({
      partyType: "CUSTOMER",
      partyId: customerId,
      type: "PAYMENT_IN",
      direction: "CREDIT",
      amount: totalPayment,
      description: "Pembayaran hutang customer",
      referenceType: "CUSTOMER_PAYMENT",
      referenceId: customerPayment.id,
      notes,
      createdBy,
    }, db)

    log.debug("[DEBT]", "Ledger PAYMENT_IN entry created", {
      customerId,
      amount: totalPayment,
      customerPaymentId: customerPayment.id,
    })
  }

  return {
    allocations,
    totalAllocated: totalPayment - remaining,
    remainingChange: remaining,
    customerPaymentId: customerPayment.id,
  }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export async function getCustomerPayments(customerId: string) {
  return globalPrisma.customerPayment.findMany({
    where: { customerId },
    include: {
      allocations: {
        include: {
          debt: {
            select: {
              id: true,
              originalAmount: true,
              remainingAmount: true,
              status: true,
              transaction: { select: { code: true } },
            },
          },
        },
      },
      sourceTransaction: { select: { code: true } },
    },
    orderBy: { paymentDate: "desc" },
  })
}

export async function getCustomerLedger(customerId: string) {
  const [debts, customerPayments, orphanDebtPayments, deposits, depositUsages] = await Promise.all([
    globalPrisma.debt.findMany({
      where: { customerId },
      include: { transaction: { select: { code: true, transactionDate: true } } },
      orderBy: { debtDate: "asc" },
    }),
    // Pembayaran baru — punya CustomerPayment header
    globalPrisma.customerPayment.findMany({
      where: { customerId },
      include: {
        allocations: {
          include: {
            debt: { select: { transaction: { select: { code: true } } } },
          },
        },
        sourceTransaction: { select: { code: true } },
      },
      orderBy: { paymentDate: "asc" },
    }),
    // Pembayaran lama — DebtPayment tanpa CustomerPayment (legacy)
    globalPrisma.debtPayment.findMany({
      where: {
        customerPaymentId: null,
        debt: { customerId },
      },
      include: {
        debt: { select: { transaction: { select: { code: true } } } },
      },
      orderBy: { paymentDate: "asc" },
    }),
    globalPrisma.deposit.findMany({
      where: { partyType: "CUSTOMER", partyId: customerId },
      orderBy: { createdAt: "asc" },
      select: { id: true, amount: true, notes: true, createdAt: true, source: true },
    }),
    globalPrisma.depositUsage.findMany({
      where: { deposit: { partyType: "CUSTOMER", partyId: customerId } },
      include: { deposit: { select: { id: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ])

  type LedgerEntry = {
    date: Date
    type: "DEBT" | "PAYMENT" | "DEPOSIT_IN" | "DEPOSIT_OUT" | "DEPOSIT_RETURN"
    description: string
    debit: number
    credit: number
    reference: string
    id: string
    meta?: any
  }

  const entries: LedgerEntry[] = []

  // Hutang = debit
  for (const debt of debts) {
    entries.push({
      date: debt.debtDate,
      type: "DEBT",
      description: `Hutang dari transaksi ${debt.transaction.code}`,
      debit: Number(debt.originalAmount),
      credit: 0,
      reference: debt.transaction.code,
      id: debt.id,
    })
  }

  // Pembayaran baru (via CustomerPayment)
  for (const payment of customerPayments) {
    const sourceLabel =
      payment.source === "POS_OVERPAYMENT"
        ? `Overpay POS ${payment.sourceTransaction?.code ?? ""}`
        : "Pembayaran langsung"

    entries.push({
      date: payment.paymentDate,
      type: "PAYMENT",
      description: sourceLabel,
      debit: 0,
      credit: Number(payment.amount),
      reference: payment.id,
      id: payment.id,
      meta: {
        notes: payment.notes,
        allocations: payment.allocations.map((a) => ({
          debtCode: a.debt.transaction.code,
          amount: Number(a.amount),
        })),
      },
    })
  }

  // Pembayaran lama (legacy DebtPayment tanpa header)
  for (const dp of orphanDebtPayments) {
    const sourceLabel =
      dp.source === "POS_OVERPAYMENT"
        ? `Overpay POS (legacy)`
        : "Pembayaran langsung (legacy)"

    entries.push({
      date: dp.paymentDate,
      type: "PAYMENT",
      description: sourceLabel,
      debit: 0,
      credit: Number(dp.amount),
      reference: dp.id,
      id: dp.id,
      meta: {
        notes: dp.notes,
        allocations: [{ debtCode: dp.debt.transaction.code, amount: Number(dp.amount) }],
      },
    })
  }

  // Deposit Masuk = kredit (customer punya saldo ke toko)
  for (const dep of deposits) {
    entries.push({
      date: dep.createdAt,
      type: "DEPOSIT_IN",
      description: `Deposit masuk (${dep.source})`,
      debit: 0,
      credit: Number(dep.amount),
      reference: dep.id,
      id: `dep-in-${dep.id}`,
      meta: { notes: dep.notes ?? undefined },
    })
  }

  // Deposit dipakai/return = debit (mengurangi saldo deposit customer)
  for (const du of depositUsages) {
    if (du.usageType === "PAYMENT") {
      entries.push({
        date: du.createdAt,
        type: "DEPOSIT_OUT",
        description: "Deposit dipakai",
        debit: Number(du.amount),
        credit: 0,
        reference: du.referenceId ?? du.depositId,
        id: `dep-use-${du.id}`,
        meta: { notes: du.notes ?? undefined },
      })
      continue
    }
    if (du.usageType === "RETURN") {
      entries.push({
        date: du.createdAt,
        type: "DEPOSIT_RETURN",
        description: "Deposit dikembalikan",
        debit: Number(du.amount),
        credit: 0,
        reference: du.referenceId ?? du.depositId,
        id: `dep-ret-${du.id}`,
        meta: { notes: du.notes ?? undefined },
      })
    }
  }

  entries.sort((a, b) => {
    const byDate = a.date.getTime() - b.date.getTime()
    if (byDate !== 0) return byDate
    return a.id.localeCompare(b.id)
  })

  let balance = 0
  const ledger = entries.map((entry) => {
    balance += entry.debit - entry.credit
    return { ...entry, balance }
  })

  const totalPaidNew = customerPayments.reduce((s, p) => s + Number(p.amount), 0)
  const totalPaidLegacy = orphanDebtPayments.reduce((s, p) => s + Number(p.amount), 0)
  const totalDepositIn = deposits.reduce((s, d) => s + Number(d.amount), 0)

  return {
    ledger,
    totalDebt: debts.reduce((s, d) => s + Number(d.originalAmount), 0),
    // "Total Dibayar" pada buku hutang = pembayaran hutang aktual.
    // Deposit masuk tetap ditampilkan di ledger entries, tapi tidak dijumlahkan sebagai pembayaran hutang.
    totalPaid: totalPaidNew + totalPaidLegacy,
    totalDepositIn,
    totalDepositOut: depositUsages
      .filter((u) => u.usageType === "PAYMENT" || u.usageType === "RETURN")
      .reduce((s, u) => s + Number(u.amount), 0),
    currentBalance: balance,
  }
}

export interface CustomerDebtBookReportParams {
  customerId: string
  dateFrom?: string
  dateTo?: string
}

export type CustomerDebtBookEntryType =
  | "DEBT"
  | "PAYMENT"
  | "DEPOSIT_IN"
  | "DEPOSIT_OUT"
  | "DEPOSIT_RETURN"

export interface CustomerDebtBookRow {
  id: string
  date: Date
  type: CustomerDebtBookEntryType
  description: string
  humanDescription: string
  reference: string
  increase: number
  decrease: number
  balance: number
  notes?: string
  allocationSummary?: string
  invoiceDetails?: {
    items: {
      productName: string
      productCode: string | null
      quantity: number
      unit: string | null
      price: number
      subtotal: number
    }[]
    subtotal: number
    discountAmount: number
    packingFee: number
    totalAmount: number
  }
}

export interface CustomerDebtBookReport {
  customer: {
    id: string
    name: string
    phone: string | null
    address: string | null
  }
  dateFrom: string
  dateTo: string
  openingBalance: number
  closingBalance: number
  rows: CustomerDebtBookRow[]
  summary: {
    totalIncrease: number
    totalDecrease: number
    totalDebt: number
    totalPayment: number
    totalDepositIn: number
    totalDepositOut: number
  }
}

function describeCustomerLedgerEntry(entry: {
  type: CustomerDebtBookEntryType
  description: string
}): string {
  switch (entry.type) {
    case "DEBT":
      return entry.description.replace(/^Hutang dari transaksi /, "Tagihan penjualan ")
    case "PAYMENT":
      return entry.description.includes("Overpay POS")
        ? entry.description.replace("Overpay POS", "Pembayaran dari kelebihan bayar POS")
        : "Pembayaran hutang"
    case "DEPOSIT_IN":
      return "Deposit masuk / saldo kredit customer"
    case "DEPOSIT_OUT":
      return "Deposit dipakai untuk pembayaran"
    case "DEPOSIT_RETURN":
      return "Deposit dikembalikan ke customer"
  }
}

export async function getCustomerDebtBookReport({
  customerId,
  dateFrom,
  dateTo,
}: CustomerDebtBookReportParams): Promise<CustomerDebtBookReport> {
  const customer = await globalPrisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, phone: true, address: true },
  })
  if (!customer) throw new NotFoundError("Customer")

  const fallbackTo = new Date()
  const fallbackFrom = subDays(fallbackTo, 29)
  const from = dateFrom ? parseDateWIB(dateFrom) : fallbackFrom
  const to = dateTo ? parseDateWIB(dateTo) : fallbackTo
  const fromBoundary = startOfDayWIB(from)
  const toBoundary = endOfDayWIB(to)

  const ledgerData = await getCustomerLedger(customerId)
  const allEntries = ledgerData.ledger
  const beforeRange = allEntries.filter((entry) => entry.date < fromBoundary)
  const openingBalance = beforeRange.length > 0 ? beforeRange[beforeRange.length - 1].balance : 0
  const entriesInRange = allEntries.filter(
    (entry) => entry.date >= fromBoundary && entry.date <= toBoundary
  )
  const debtIdsInRange = entriesInRange
    .filter((entry) => entry.type === "DEBT")
    .map((entry) => entry.id)
  const debtDetails = debtIdsInRange.length
    ? await globalPrisma.debt.findMany({
        where: { id: { in: debtIdsInRange } },
        include: {
          transaction: {
            include: {
              items: {
                include: {
                  product: { select: { code: true, unit: true } },
                },
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              },
            },
          },
        },
      })
    : []
  const debtDetailById = new Map(debtDetails.map((debt) => [debt.id, debt]))

  const rows: CustomerDebtBookRow[] = entriesInRange.map((entry) => {
    const allocations = entry.meta?.allocations as { debtCode: string; amount: number }[] | undefined
    const debtDetail = entry.type === "DEBT" ? debtDetailById.get(entry.id) : undefined
    return {
      id: entry.id,
      date: entry.date,
      type: entry.type,
      description: entry.description,
      humanDescription: describeCustomerLedgerEntry(entry),
      reference: entry.reference,
      increase: entry.debit,
      decrease: entry.credit,
      balance: entry.balance,
      notes: entry.meta?.notes,
      allocationSummary: allocations?.length
        ? allocations.map((a) => `${a.debtCode}: Rp ${Number(a.amount).toLocaleString("id-ID")}`).join("; ")
        : undefined,
      invoiceDetails: debtDetail
        ? {
            items: debtDetail.transaction.items.map((item) => ({
              productName: item.productName,
              productCode: item.product?.code ?? null,
              quantity: Number(item.quantity),
              unit: item.product?.unit ?? null,
              price: Number(item.sellPrice) - Number(item.discountAmount),
              subtotal: Number(item.subtotal),
            })),
            subtotal: Number(debtDetail.transaction.subtotal),
            discountAmount: Number(debtDetail.transaction.discountAmount),
            packingFee: Number(debtDetail.transaction.packingFee),
            totalAmount: Number(debtDetail.transaction.totalAmount),
          }
        : undefined,
    }
  })

  const totalIncrease = rows.reduce((sum, row) => sum + row.increase, 0)
  const totalDecrease = rows.reduce((sum, row) => sum + row.decrease, 0)
  const closingBalance = rows.length > 0 ? rows[rows.length - 1].balance : openingBalance

  return {
    customer,
    dateFrom: formatDateWIB(fromBoundary),
    dateTo: formatDateWIB(startOfDayWIB(to)),
    openingBalance,
    closingBalance,
    rows,
    summary: {
      totalIncrease,
      totalDecrease,
      totalDebt: rows.filter((row) => row.type === "DEBT").reduce((sum, row) => sum + row.increase, 0),
      totalPayment: rows.filter((row) => row.type === "PAYMENT").reduce((sum, row) => sum + row.decrease, 0),
      totalDepositIn: rows.filter((row) => row.type === "DEPOSIT_IN").reduce((sum, row) => sum + row.decrease, 0),
      totalDepositOut: rows
        .filter((row) => row.type === "DEPOSIT_OUT" || row.type === "DEPOSIT_RETURN")
        .reduce((sum, row) => sum + row.increase, 0),
    },
  }
}
