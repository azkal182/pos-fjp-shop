import "dotenv/config"
import { prisma } from "../src/lib/prisma"

type CountRow = { count: bigint }

async function count(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(sql)
  return Number(rows[0]?.count ?? 0n)
}

async function main() {
  console.log("=== PROD FIX AUDIT (DRY-RUN) ===")
  console.log(`Time: ${new Date().toISOString()}`)

  const salesTotal = await count('SELECT COUNT(*)::bigint AS count FROM "transactions"')
  const salesPaid = await count("SELECT COUNT(*)::bigint AS count FROM \"transactions\" WHERE \"paymentStatus\" = 'PAID'")
  const salesUnpaid = await count("SELECT COUNT(*)::bigint AS count FROM \"transactions\" WHERE \"paymentStatus\" = 'UNPAID'")

  const purchaseTotal = await count('SELECT COUNT(*)::bigint AS count FROM "purchases"')
  const purchaseUnpaid = await count("SELECT COUNT(*)::bigint AS count FROM \"purchases\" WHERE \"paymentStatus\" = 'UNPAID'")

  const debtOpen = await count('SELECT COUNT(*)::bigint AS count FROM "debts" WHERE "remainingAmount" > 0')
  const vendorDebtOpen = await count('SELECT COUNT(*)::bigint AS count FROM "vendor_debts" WHERE "remainingAmount" > 0')

  const wrongDepositReturnDirection = await count(
    "SELECT COUNT(*)::bigint AS count FROM \"ledger_entries\" WHERE \"type\"='DEPOSIT_RETURN' AND \"direction\"='CREDIT'"
  )

  const invalidCustomerDeposit = await count(
    `SELECT COUNT(*)::bigint AS count
     FROM "deposits" d
     LEFT JOIN "customers" c ON c."id" = d."partyId"
     WHERE d."partyType" = 'CUSTOMER' AND c."id" IS NULL`
  )

  const invalidVendorDeposit = await count(
    `SELECT COUNT(*)::bigint AS count
     FROM "deposits" d
     LEFT JOIN "vendors" v ON v."id" = d."partyId"
     WHERE d."partyType" = 'VENDOR' AND v."id" IS NULL`
  )

  const ledgerMismatch = await count(
    `WITH expected AS (
       SELECT
         le."id",
         SUM(CASE WHEN le."direction"='DEBIT' THEN le."amount" ELSE -le."amount" END)
           OVER (PARTITION BY le."accountId" ORDER BY le."createdAt", le."id") AS expected_balance
       FROM "ledger_entries" le
     )
     SELECT COUNT(*)::bigint AS count
     FROM "ledger_entries" le
     JOIN expected e ON e."id" = le."id"
     WHERE le."runningBalance" IS DISTINCT FROM e.expected_balance`
  )

  const fkVendorExistsRows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (
       SELECT 1
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       WHERE t.relname = 'deposits' AND c.conname = 'deposit_vendor_fk'
     )`
  )
  const fkVendorExists = fkVendorExistsRows[0]?.exists ?? false

  console.log("\n-- Snapshot --")
  console.log(`Sales total        : ${salesTotal}`)
  console.log(`Sales PAID         : ${salesPaid}`)
  console.log(`Sales UNPAID       : ${salesUnpaid}`)
  console.log(`Purchases total    : ${purchaseTotal}`)
  console.log(`Purchases UNPAID   : ${purchaseUnpaid}`)
  console.log(`Open customer debt : ${debtOpen}`)
  console.log(`Open vendor debt   : ${vendorDebtOpen}`)

  console.log("\n-- Potential Issues --")
  console.log(`Wrong DEPOSIT_RETURN direction : ${wrongDepositReturnDirection}`)
  console.log(`Invalid CUSTOMER deposits      : ${invalidCustomerDeposit}`)
  console.log(`Invalid VENDOR deposits        : ${invalidVendorDeposit}`)
  console.log(`Ledger running mismatch rows   : ${ledgerMismatch}`)
  console.log(`FK deposit_vendor_fk exists    : ${fkVendorExists}`)

  console.log("\nNo data changed. This is dry-run audit only.")
}

main()
  .catch((e) => {
    console.error("Audit failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
