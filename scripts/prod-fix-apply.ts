import "dotenv/config"
import { prisma } from "../src/lib/prisma"

type CountRow = { count: bigint }

async function count(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(sql)
  return Number(rows[0]?.count ?? 0n)
}

async function main() {
  console.log("=== PROD FIX APPLY ===")
  console.log(`Time: ${new Date().toISOString()}`)

  const beforeWrongDirection = await count(
    "SELECT COUNT(*)::bigint AS count FROM \"ledger_entries\" WHERE \"type\"='DEPOSIT_RETURN' AND \"direction\"='CREDIT'"
  )
  const beforeMismatch = await count(
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

  console.log(`Before - wrong DEPOSIT_RETURN direction: ${beforeWrongDirection}`)
  console.log(`Before - ledger mismatch rows         : ${beforeMismatch}`)

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('ALTER TABLE "deposits" DROP CONSTRAINT IF EXISTS "deposit_vendor_fk"')

    await tx.$executeRawUnsafe(
      `UPDATE "ledger_entries"
       SET "direction" = 'DEBIT'
       WHERE "type" = 'DEPOSIT_RETURN' AND "direction" = 'CREDIT'`
    )

    await tx.$executeRawUnsafe(
      `WITH expected AS (
         SELECT
           le."id",
           SUM(CASE WHEN le."direction"='DEBIT' THEN le."amount" ELSE -le."amount" END)
             OVER (PARTITION BY le."accountId" ORDER BY le."createdAt", le."id") AS expected_balance
         FROM "ledger_entries" le
       )
       UPDATE "ledger_entries" le
       SET "runningBalance" = expected.expected_balance
       FROM expected
       WHERE le."id" = expected."id"
         AND le."runningBalance" IS DISTINCT FROM expected.expected_balance`
    )
  })

  const afterWrongDirection = await count(
    "SELECT COUNT(*)::bigint AS count FROM \"ledger_entries\" WHERE \"type\"='DEPOSIT_RETURN' AND \"direction\"='CREDIT'"
  )
  const afterMismatch = await count(
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

  console.log(`After  - wrong DEPOSIT_RETURN direction: ${afterWrongDirection}`)
  console.log(`After  - ledger mismatch rows         : ${afterMismatch}`)
  console.log("Apply done.")
}

main()
  .catch((e) => {
    console.error("Apply failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
