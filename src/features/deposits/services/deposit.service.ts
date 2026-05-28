import type { PrismaClient, DepositSource } from "@/generated/prisma"
import { prisma as globalPrisma } from "@/lib/prisma"
import { ValidationError } from "@/lib/exceptions"
import { addEntry } from "@/features/ledger/services/ledger.service"
import { log } from "@/lib/logger"

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
type PartyType = "CUSTOMER" | "VENDOR"

export async function getAvailableDeposit(partyType: PartyType, partyId: string) {
  const deposits = await globalPrisma.deposit.findMany({
    where: { partyType, partyId, balance: { gt: 0 } },
    orderBy: { createdAt: "asc" },
  })
  const totalBalance = deposits.reduce((s, d) => s + Number(d.balance), 0)
  return { totalBalance, deposits }
}

export async function createDeposit(
  partyType: PartyType,
  partyId: string,
  amount: number,
  source: DepositSource,
  sourceId: string | null,
  createdBy: string,
  notes?: string,
  db: TxClient = globalPrisma
) {
  const deposit = await db.deposit.create({
    data: {
      partyType,
      partyId,
      amount,
      balance: amount,
      source,
      sourceId,
      notes,
    },
  })

  // LedgerEntry: DEPOSIT_IN CREDIT (toko "hutang" ke party)
  await addEntry({
    partyType,
    partyId,
    type: "DEPOSIT_IN",
    direction: "CREDIT",
    amount,
    description: `Deposit masuk — ${source === "OVERPAY_TRANSACTION" ? "kelebihan bayar POS" : source === "OVERPAY_PURCHASE" ? "kelebihan bayar PO" : "deposit manual"}`,
    referenceType: "DEPOSIT",
    referenceId: deposit.id,
    notes,
    createdBy,
  }, db)

  log.info("[DEPOSIT]", "Deposit created", { partyType, partyId, amount, source })
  return deposit
}

export async function useDeposit(
  depositId: string,
  amount: number,
  referenceType: string,
  referenceId: string,
  createdBy: string,
  expectedParty?: { partyType: PartyType; partyId: string },
  options?: { writeLedger?: boolean },
  db: TxClient = globalPrisma
) {
  const deposit = await db.deposit.findUniqueOrThrow({ where: { id: depositId } })

  if (
    expectedParty &&
    (deposit.partyType !== expectedParty.partyType || deposit.partyId !== expectedParty.partyId)
  ) {
    throw new ValidationError("Deposit tidak sesuai dengan pihak transaksi")
  }

  if (amount > Number(deposit.balance)) {
    throw new ValidationError(`Saldo deposit tidak cukup. Tersedia: Rp ${Number(deposit.balance).toLocaleString("id-ID")}`)
  }

  const newBalance = Number(deposit.balance) - amount

  await db.deposit.update({
    where: { id: depositId },
    data: {
      usedAmount: { increment: amount },
      balance: newBalance,
    },
  })

  await db.depositUsage.create({
    data: { depositId, amount, usageType: "PAYMENT", referenceId },
  })

  const writeLedger = options?.writeLedger ?? true
  if (writeLedger) {
    // LedgerEntry DEPOSIT_OUT hanya untuk kasus standalone.
    // Pada flow PO/POS, invoice + payment sudah merepresentasikan settlement.
    await addEntry({
      partyType: deposit.partyType as PartyType,
      partyId: deposit.partyId,
      type: "DEPOSIT_OUT",
      direction: "DEBIT",
      amount,
      description: "Deposit digunakan untuk pembayaran",
      referenceType,
      referenceId,
      createdBy,
    }, db)
  }

  log.info("[DEPOSIT]", "Deposit used", { depositId, amount, referenceType, referenceId })
  return deposit
}

export async function useDepositFifo(
  partyType: PartyType,
  partyId: string,
  amount: number,
  referenceType: string,
  referenceId: string,
  createdBy: string,
  options?: { writeLedger?: boolean },
  db: TxClient = globalPrisma
) {
  if (amount <= 0) return { used: 0 }

  const deposits = await db.deposit.findMany({
    where: { partyType, partyId, balance: { gt: 0 } },
    orderBy: { createdAt: "asc" },
    select: { id: true, balance: true },
  })

  let remaining = amount
  for (const dep of deposits) {
    if (remaining <= 0) break
    const take = Math.min(remaining, Number(dep.balance))
    if (take <= 0) continue
    await useDeposit(
      dep.id,
      take,
      referenceType,
      referenceId,
      createdBy,
      { partyType, partyId },
      options,
      db
    )
    remaining -= take
  }

  if (remaining > 0) {
    throw new ValidationError(`Saldo deposit tidak cukup. Kekurangan: Rp ${remaining.toLocaleString("id-ID")}`)
  }

  return { used: amount }
}

export async function returnDeposit(
  depositId: string,
  amount: number,
  paymentMethod: "CASH" | "TRANSFER",
  createdBy: string,
  notes?: string
) {
  await globalPrisma.$transaction(async (tx) => {
    const deposit = await tx.deposit.findUniqueOrThrow({ where: { id: depositId } })

    if (amount > Number(deposit.balance)) {
      throw new ValidationError(`Saldo deposit tidak cukup. Tersedia: Rp ${Number(deposit.balance).toLocaleString("id-ID")}`)
    }

    const newBalance = Number(deposit.balance) - amount

    await tx.deposit.update({
      where: { id: depositId },
      data: {
        returnedAmount: { increment: amount },
        balance: newBalance,
      },
    })

    await tx.depositUsage.create({
      data: { depositId, amount, usageType: "RETURN", notes },
    })

    // LedgerEntry: DEPOSIT_RETURN DEBIT (membalik efek DEPOSIT_IN)
    await addEntry({
      partyType: deposit.partyType as PartyType,
      partyId: deposit.partyId,
      type: "DEPOSIT_RETURN",
      direction: "DEBIT",
      amount,
      description: `Deposit dikembalikan (${paymentMethod === "CASH" ? "tunai" : "transfer"})`,
      paymentMethod,
      referenceType: "DEPOSIT",
      referenceId: depositId,
      notes,
      createdBy,
    }, tx)
  })

  log.info("[DEPOSIT]", "Deposit returned", { depositId, amount, paymentMethod })
}
