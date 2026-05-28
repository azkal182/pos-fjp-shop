import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('=== REPAIR AUTO_RECALC LEDGER ===')

  const toDelete = await prisma.ledgerEntry.findMany({
    where: {
      notes: 'AUTO_RECALC',
      type: 'DEPOSIT_OUT',
      referenceType: 'DEPOSIT',
      referenceId: 'AUTO_RECALC',
    },
    select: { id: true, accountId: true },
  })

  console.log(`Found entries to delete: ${toDelete.length}`)
  if (toDelete.length === 0) return

  const accountIds = Array.from(new Set(toDelete.map((e) => e.accountId)))

  await prisma.$transaction(async (tx) => {
    await tx.ledgerEntry.deleteMany({
      where: {
        id: { in: toDelete.map((e) => e.id) },
      },
    })

    for (const accountId of accountIds) {
      await tx.$executeRawUnsafe(`
        WITH expected AS (
          SELECT
            le."id",
            SUM(CASE WHEN le."direction"='DEBIT' THEN le."amount" ELSE -le."amount" END)
              OVER (PARTITION BY le."accountId" ORDER BY le."createdAt", le."id") AS expected_balance
          FROM "ledger_entries" le
          WHERE le."accountId" = '${accountId}'
        )
        UPDATE "ledger_entries" le
        SET "runningBalance" = expected.expected_balance
        FROM expected
        WHERE le."id" = expected."id"
      `)
    }
  })

  console.log('Repair done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
