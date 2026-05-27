import "dotenv/config"
import { prisma } from "../src/lib/prisma"

type NumRow = { value: number | string | bigint | null }
async function scalar(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<NumRow[]>(sql)
  const v = rows[0]?.value
  if (v === null || v === undefined) return 0
  if (typeof v === "bigint") return Number(v)
  if (typeof v === "number") return v
  return Number(v)
}

async function main() {
  console.log("=== PROD FIX RECONCILE ===")
  console.log(`Time: ${new Date().toISOString()}`)

  const salesTotal = await scalar('SELECT COUNT(*)::bigint AS value FROM "transactions"')
  const salesPaid = await scalar("SELECT COUNT(*)::bigint AS value FROM \"transactions\" WHERE \"paymentStatus\"='PAID'")
  const salesUnpaid = await scalar("SELECT COUNT(*)::bigint AS value FROM \"transactions\" WHERE \"paymentStatus\"='UNPAID'")

  const purchasesTotal = await scalar('SELECT COUNT(*)::bigint AS value FROM "purchases"')
  const purchasesUnpaid = await scalar("SELECT COUNT(*)::bigint AS value FROM \"purchases\" WHERE \"paymentStatus\"='UNPAID'")

  const debtOutstanding = await scalar('SELECT COALESCE(SUM("remainingAmount"),0)::numeric AS value FROM "debts"')
  const vendorDebtOutstanding = await scalar('SELECT COALESCE(SUM("remainingAmount"),0)::numeric AS value FROM "vendor_debts"')

  const customerLedgerBalance = await scalar(
    `SELECT COALESCE(SUM(lb.balance),0)::numeric AS value
     FROM (
       SELECT DISTINCT ON (la."id") la."id",
         COALESCE(le."runningBalance", 0) AS balance
       FROM "ledger_accounts" la
       LEFT JOIN "ledger_entries" le ON le."accountId" = la."id"
       WHERE la."partyType"='CUSTOMER'
       ORDER BY la."id", le."createdAt" DESC, le."id" DESC
     ) lb`
  )

  const vendorLedgerBalance = await scalar(
    `SELECT COALESCE(SUM(lb.balance),0)::numeric AS value
     FROM (
       SELECT DISTINCT ON (la."id") la."id",
         COALESCE(le."runningBalance", 0) AS balance
       FROM "ledger_accounts" la
       LEFT JOIN "ledger_entries" le ON le."accountId" = la."id"
       WHERE la."partyType"='VENDOR'
       ORDER BY la."id", le."createdAt" DESC, le."id" DESC
     ) lb`
  )

  const wrongDepositReturnDirection = await scalar(
    "SELECT COUNT(*)::bigint AS value FROM \"ledger_entries\" WHERE \"type\"='DEPOSIT_RETURN' AND \"direction\"='CREDIT'"
  )

  const ledgerMismatch = await scalar(
    `WITH expected AS (
       SELECT
         le."id",
         SUM(CASE WHEN le."direction"='DEBIT' THEN le."amount" ELSE -le."amount" END)
           OVER (PARTITION BY le."accountId" ORDER BY le."createdAt", le."id") AS expected_balance
       FROM "ledger_entries" le
     )
     SELECT COUNT(*)::bigint AS value
     FROM "ledger_entries" le
     JOIN expected e ON e."id" = le."id"
     WHERE le."runningBalance" IS DISTINCT FROM e.expected_balance`
  )

  console.log("\n-- Business Snapshot --")
  console.log(`Sales: total=${salesTotal}, paid=${salesPaid}, unpaid=${salesUnpaid}`)
  console.log(`Purchases: total=${purchasesTotal}, unpaid=${purchasesUnpaid}`)
  console.log(`Outstanding debt customer (sum): ${debtOutstanding}`)
  console.log(`Outstanding debt vendor   (sum): ${vendorDebtOutstanding}`)

  console.log("\n-- Ledger Snapshot --")
  console.log(`Total customer ledger balance: ${customerLedgerBalance}`)
  console.log(`Total vendor ledger balance  : ${vendorLedgerBalance}`)

  console.log("\n-- Integrity Check --")
  console.log(`Wrong DEPOSIT_RETURN direction: ${wrongDepositReturnDirection}`)
  console.log(`Ledger running mismatch rows : ${ledgerMismatch}`)
}

main()
  .catch((e) => {
    console.error("Reconcile failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
