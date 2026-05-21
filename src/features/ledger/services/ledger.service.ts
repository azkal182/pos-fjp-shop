import type { PrismaClient, LedgerEntryType, EntryDirection, PaymentMethod } from "@/generated/prisma"
import { prisma as globalPrisma } from "@/lib/prisma"
import { log } from "@/lib/logger"

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">

export type PartyType = "CUSTOMER" | "VENDOR"

// ─── Account ──────────────────────────────────────────────────────────────────

export async function getOrCreateAccount(partyType: PartyType, partyId: string, db: TxClient = globalPrisma) {
  return db.ledgerAccount.upsert({
    where: { partyType_partyId: { partyType, partyId } },
    update: {},
    create: { partyType, partyId },
  })
}

export async function getAccountBalance(partyType: PartyType, partyId: string): Promise<number> {
  const lastEntry = await globalPrisma.ledgerEntry.findFirst({
    where: { account: { partyType, partyId } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { runningBalance: true },
  })
  return Number(lastEntry?.runningBalance ?? 0)
}

// ─── Entry ────────────────────────────────────────────────────────────────────

interface AddEntryParams {
  partyType: PartyType
  partyId: string
  type: LedgerEntryType
  direction: EntryDirection
  amount: number
  description: string
  paymentMethod?: PaymentMethod
  referenceType?: string
  referenceId?: string
  notes?: string
  createdBy: string
  createdAt?: Date
}

export async function addEntry(params: AddEntryParams, db: TxClient = globalPrisma) {
  const account = await getOrCreateAccount(params.partyType, params.partyId, db)

  // Ambil running balance terakhir
  // Gunakan [createdAt desc, id desc] sebagai tiebreaker agar deterministik
  // ketika dua entry dibuat dalam satu transaksi dengan timestamp yang berdekatan.
  const lastEntry = await db.ledgerEntry.findFirst({
    where: { accountId: account.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { runningBalance: true },
  })
  const currentBalance = Number(lastEntry?.runningBalance ?? 0)

  // DEBIT = tambah hutang (balance naik), CREDIT = kurangi hutang (balance turun)
  const newBalance =
    params.direction === "DEBIT"
      ? currentBalance + params.amount
      : currentBalance - params.amount

  const entry = await db.ledgerEntry.create({
    data: {
      accountId: account.id,
      type: params.type,
      direction: params.direction,
      amount: params.amount,
      runningBalance: newBalance,
      description: params.description,
      paymentMethod: params.paymentMethod ?? null,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
      notes: params.notes ?? null,
      createdBy: params.createdBy,
      createdAt: params.createdAt ?? new Date(),
    },
  })

  log.info("[LEDGER]", "Entry added", {
    partyType: params.partyType,
    partyId: params.partyId,
    type: params.type,
    direction: params.direction,
    amount: params.amount,
    runningBalance: newBalance,
  })

  return entry
}

// ─── Query ────────────────────────────────────────────────────────────────────

export interface LedgerFilter {
  dateFrom?: Date
  dateTo?: Date
  type?: LedgerEntryType
  page?: number
  limit?: number
}

export async function getLedger(partyType: PartyType, partyId: string, filter: LedgerFilter = {}) {
  const { dateFrom, dateTo, type, page = 1, limit = 50 } = filter

  const account = await globalPrisma.ledgerAccount.findUnique({
    where: { partyType_partyId: { partyType, partyId } },
  })

  if (!account) return { entries: [], balance: 0, totalEntries: 0, totalDebit: 0, totalCredit: 0 }

  const where = {
    accountId: account.id,
    ...(type && { type }),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      },
    }),
  }

  // Ambil summary dari SEMUA entries (bukan hanya halaman ini)
  const allEntries = await globalPrisma.ledgerEntry.findMany({
    where: { accountId: account.id },
    select: { direction: true, amount: true },
  })
  const totalDebit = allEntries.filter((e) => e.direction === "DEBIT").reduce((s, e) => s + Number(e.amount), 0)
  const totalCredit = allEntries.filter((e) => e.direction === "CREDIT").reduce((s, e) => s + Number(e.amount), 0)

  const [entries, totalEntries] = await Promise.all([
    globalPrisma.ledgerEntry.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    globalPrisma.ledgerEntry.count({ where }),
  ])

  const balance = await getAccountBalance(partyType, partyId)

  return { entries, balance, totalEntries, totalDebit, totalCredit }
}

// ─── Recalculate running balance ──────────────────────────────────────────────
// Digunakan untuk memperbaiki data lama yang running balance-nya salah
// akibat dua entry dibuat dengan createdAt identik dalam satu transaksi.

export async function recalculateLedger(partyType: PartyType, partyId: string) {
  const account = await globalPrisma.ledgerAccount.findUnique({
    where: { partyType_partyId: { partyType, partyId } },
  })
  if (!account) return { fixed: 0 }

  // Ambil semua entry diurutkan by createdAt asc, id asc (deterministik)
  const entries = await globalPrisma.ledgerEntry.findMany({
    where: { accountId: account.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })

  let runningBalance = 0
  let fixed = 0

  for (const entry of entries) {
    const newBalance =
      entry.direction === "DEBIT"
        ? runningBalance + Number(entry.amount)
        : runningBalance - Number(entry.amount)

    if (Number(entry.runningBalance) !== newBalance) {
      await globalPrisma.ledgerEntry.update({
        where: { id: entry.id },
        data: { runningBalance: newBalance },
      })
      fixed++
    }

    runningBalance = newBalance
  }

  log.info("[LEDGER]", "Recalculate done", { partyType, partyId, totalEntries: entries.length, fixed })
  return { fixed, totalEntries: entries.length }
}



export async function addAdjustment(
  partyType: PartyType,
  partyId: string,
  amount: number,
  direction: EntryDirection,
  description: string,
  createdBy: string,
  notes?: string
) {
  return addEntry({
    partyType,
    partyId,
    type: "ADJUSTMENT",
    direction,
    amount,
    description,
    notes,
    createdBy,
  })
}
