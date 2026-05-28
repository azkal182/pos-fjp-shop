import "dotenv/config"
import { prisma } from "../src/lib/prisma"

type Allocation = {
  debtId: string
  depositId: string
  amount: number
  transactionId?: string | null
  purchaseId?: string | null
}

function buildAllocations(
  debts: { id: string; remaining: number; transactionId?: string | null; purchaseId?: string | null }[],
  deposits: { id: string; balance: number }[]
) {
  const out: Allocation[] = []
  let di = 0
  let pi = 0
  const d = debts.map((x) => ({ ...x }))
  const p = deposits.map((x) => ({ ...x }))

  while (di < d.length && pi < p.length) {
    if (d[di].remaining <= 0) { di++; continue }
    if (p[pi].balance <= 0) { pi++; continue }

    const amount = Math.min(d[di].remaining, p[pi].balance)
    if (amount <= 0) break

    out.push({
      debtId: d[di].id,
      depositId: p[pi].id,
      amount,
      transactionId: d[di].transactionId,
      purchaseId: d[di].purchaseId,
    })

    d[di].remaining -= amount
    p[pi].balance -= amount
  }

  return out
}

function statusFromRemaining(remaining: number, paid: number) {
  if (remaining <= 0) return "PAID" as const
  return paid > 0 ? "PARTIAL" as const : "UNPAID" as const
}

async function main() {
  const apply = process.argv.includes("--apply")
  const now = new Date()

  console.log("=== RECALC AUTO OFFSET DEPOSIT (FIFO) ===")
  console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN"}`)

  const customerIdsWithDebt = await prisma.debt.findMany({
    where: { status: { in: ["UNPAID", "PARTIAL"] }, remainingAmount: { gt: 0 } },
    select: { customerId: true },
    distinct: ["customerId"],
  })

  const vendorIdsWithDebt = await prisma.vendorDebt.findMany({
    where: { status: { in: ["UNPAID", "PARTIAL"] }, remainingAmount: { gt: 0 } },
    select: { vendorId: true },
    distinct: ["vendorId"],
  })

  let totalCustomerOffset = 0
  let totalVendorOffset = 0
  let customerPartyTouched = 0
  let vendorPartyTouched = 0
  const details: Array<Record<string, unknown>> = []

  // CUSTOMER
  for (const c of customerIdsWithDebt) {
    const [debts, deposits] = await Promise.all([
      prisma.debt.findMany({
        where: { customerId: c.customerId, status: { in: ["UNPAID", "PARTIAL"] }, remainingAmount: { gt: 0 } },
        orderBy: [{ debtDate: "asc" }, { createdAt: "asc" }],
        select: { id: true, remainingAmount: true, paidAmount: true, transactionId: true },
      }),
      prisma.deposit.findMany({
        where: { partyType: "CUSTOMER", partyId: c.customerId, balance: { gt: 0 } },
        orderBy: { createdAt: "asc" },
        select: { id: true, balance: true },
      }),
    ])

    const allocs = buildAllocations(
      debts.map((d) => ({ id: d.id, remaining: Number(d.remainingAmount), transactionId: d.transactionId })),
      deposits.map((d) => ({ id: d.id, balance: Number(d.balance) }))
    )

    const totalAlloc = allocs.reduce((s, a) => s + a.amount, 0)
    if (totalAlloc <= 0) continue

    customerPartyTouched++
    totalCustomerOffset += totalAlloc
    details.push({
      partyType: "CUSTOMER",
      partyId: c.customerId,
      beforeOutstanding: debts.reduce((s, d) => s + Number(d.remainingAmount), 0),
      beforeDepositBalance: deposits.reduce((s, d) => s + Number(d.balance), 0),
      offsetAmount: totalAlloc,
      afterOutstanding: debts.reduce((s, d) => s + Number(d.remainingAmount), 0) - totalAlloc,
      afterDepositBalance: deposits.reduce((s, d) => s + Number(d.balance), 0) - totalAlloc,
      allocations: allocs.map((a) => ({ debtId: a.debtId, depositId: a.depositId, amount: a.amount })),
    })

    if (!apply) continue

    await prisma.$transaction(async (tx) => {
      const byDebt = new Map<string, number>()
      const byTrx = new Map<string, number>()
      const byDeposit = new Map<string, number>()
      for (const a of allocs) {
        byDebt.set(a.debtId, (byDebt.get(a.debtId) ?? 0) + a.amount)
        if (a.transactionId) byTrx.set(a.transactionId, (byTrx.get(a.transactionId) ?? 0) + a.amount)
        byDeposit.set(a.depositId, (byDeposit.get(a.depositId) ?? 0) + a.amount)
      }

      for (const [debtId, amount] of byDebt) {
        const debt = debts.find((d) => d.id === debtId)!
        const newPaid = Number(debt.paidAmount) + amount
        const newRemain = Math.max(0, Number(debt.remainingAmount) - amount)
        await tx.debtPayment.create({
          data: {
            debtId,
            amount,
            source: "POS_OVERPAYMENT",
            notes: "AUTO_RECALC: payment from existing deposit",
          },
        })
        await tx.debt.update({
          where: { id: debtId },
          data: {
            paidAmount: newPaid,
            remainingAmount: newRemain,
            status: statusFromRemaining(newRemain, newPaid),
            settledAt: newRemain <= 0 ? now : null,
          },
        })
      }

      for (const [depositId, amount] of byDeposit) {
        await tx.deposit.update({
          where: { id: depositId },
          data: {
            usedAmount: { increment: amount },
            balance: { decrement: amount },
          },
        })
        await tx.depositUsage.create({
          data: {
            depositId,
            amount,
            usageType: "PAYMENT",
            referenceId: "AUTO_RECALC",
            notes: "AUTO_RECALC: offset hutang existing",
          },
        })
      }

      for (const [trxId, amount] of byTrx) {
        const trx = await tx.transaction.findUniqueOrThrow({ where: { id: trxId } })
        const newDebt = Math.max(0, Number(trx.debtAmount) - amount)
        await tx.transaction.update({
          where: { id: trxId },
          data: {
            debtAmount: newDebt,
            paymentStatus: newDebt <= 0 ? "PAID" : Number(trx.paidAmount) > 0 ? "PARTIAL" : "UNPAID",
          },
        })
      }

      // Tidak menulis ledger entry tambahan.
      // Offset debt vs deposit menjaga net balance tetap sama.
    })
  }

  // VENDOR
  for (const v of vendorIdsWithDebt) {
    const [debts, deposits] = await Promise.all([
      prisma.vendorDebt.findMany({
        where: { vendorId: v.vendorId, status: { in: ["UNPAID", "PARTIAL"] }, remainingAmount: { gt: 0 } },
        orderBy: [{ debtDate: "asc" }, { createdAt: "asc" }],
        select: { id: true, remainingAmount: true, paidAmount: true, purchaseId: true },
      }),
      prisma.deposit.findMany({
        where: { partyType: "VENDOR", partyId: v.vendorId, balance: { gt: 0 } },
        orderBy: { createdAt: "asc" },
        select: { id: true, balance: true },
      }),
    ])

    const allocs = buildAllocations(
      debts.map((d) => ({ id: d.id, remaining: Number(d.remainingAmount), purchaseId: d.purchaseId })),
      deposits.map((d) => ({ id: d.id, balance: Number(d.balance) }))
    )

    const totalAlloc = allocs.reduce((s, a) => s + a.amount, 0)
    if (totalAlloc <= 0) continue

    vendorPartyTouched++
    totalVendorOffset += totalAlloc
    details.push({
      partyType: "VENDOR",
      partyId: v.vendorId,
      beforeOutstanding: debts.reduce((s, d) => s + Number(d.remainingAmount), 0),
      beforeDepositBalance: deposits.reduce((s, d) => s + Number(d.balance), 0),
      offsetAmount: totalAlloc,
      afterOutstanding: debts.reduce((s, d) => s + Number(d.remainingAmount), 0) - totalAlloc,
      afterDepositBalance: deposits.reduce((s, d) => s + Number(d.balance), 0) - totalAlloc,
      allocations: allocs.map((a) => ({ debtId: a.debtId, depositId: a.depositId, amount: a.amount })),
    })

    if (!apply) continue

    await prisma.$transaction(async (tx) => {
      const byDebt = new Map<string, number>()
      const byPurchase = new Map<string, number>()
      const byDeposit = new Map<string, number>()
      for (const a of allocs) {
        byDebt.set(a.debtId, (byDebt.get(a.debtId) ?? 0) + a.amount)
        if (a.purchaseId) byPurchase.set(a.purchaseId, (byPurchase.get(a.purchaseId) ?? 0) + a.amount)
        byDeposit.set(a.depositId, (byDeposit.get(a.depositId) ?? 0) + a.amount)
      }

      for (const [debtId, amount] of byDebt) {
        const debt = debts.find((d) => d.id === debtId)!
        const newPaid = Number(debt.paidAmount) + amount
        const newRemain = Math.max(0, Number(debt.remainingAmount) - amount)
        await tx.vendorDebtPayment.create({
          data: {
            debtId,
            amount,
            source: "POS_OVERPAYMENT",
            notes: "AUTO_RECALC: payment from existing deposit",
          },
        })
        await tx.vendorDebt.update({
          where: { id: debtId },
          data: {
            paidAmount: newPaid,
            remainingAmount: newRemain,
            status: statusFromRemaining(newRemain, newPaid),
            settledAt: newRemain <= 0 ? now : null,
          },
        })
      }

      for (const [depositId, amount] of byDeposit) {
        await tx.deposit.update({
          where: { id: depositId },
          data: {
            usedAmount: { increment: amount },
            balance: { decrement: amount },
          },
        })
        await tx.depositUsage.create({
          data: {
            depositId,
            amount,
            usageType: "PAYMENT",
            referenceId: "AUTO_RECALC",
            notes: "AUTO_RECALC: offset hutang existing",
          },
        })
      }

      for (const [purchaseId, amount] of byPurchase) {
        const po = await tx.purchase.findUniqueOrThrow({ where: { id: purchaseId } })
        const newDebt = Math.max(0, Number(po.debtAmount) - amount)
        await tx.purchase.update({
          where: { id: purchaseId },
          data: {
            debtAmount: newDebt,
            paymentStatus: newDebt <= 0 ? "PAID" : Number(po.paidAmount) > 0 ? "PARTIAL" : "UNPAID",
          },
        })
      }

      // Tidak menulis ledger entry tambahan.
      // Offset debt vs deposit menjaga net balance tetap sama.
    })
  }

  console.log("\n-- Detailed Dry-run/Apply Plan --")
  for (const d of details) {
    console.log(JSON.stringify(d))
  }
  console.log(`Customer parties adjusted: ${customerPartyTouched}`)
  console.log(`Vendor parties adjusted  : ${vendorPartyTouched}`)
  console.log(`Total customer offset    : ${totalCustomerOffset}`)
  console.log(`Total vendor offset      : ${totalVendorOffset}`)
  console.log(apply ? "Apply done." : "Dry-run only.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
