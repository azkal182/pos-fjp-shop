import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

async function main(){
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    WITH debt_sum AS (
      SELECT vd."vendorId" AS vendor_id, COALESCE(SUM(vd."remainingAmount"),0) AS outstanding
      FROM "vendor_debts" vd
      GROUP BY vd."vendorId"
    ),
    dep_sum AS (
      SELECT d."partyId" AS vendor_id, COALESCE(SUM(d."balance"),0) AS deposit_balance
      FROM "deposits" d
      WHERE d."partyType"='VENDOR'
      GROUP BY d."partyId"
    ),
    led AS (
      SELECT la."partyId" AS vendor_id,
             COALESCE((
               SELECT le."runningBalance"
               FROM "ledger_entries" le
               WHERE le."accountId" = la."id"
               ORDER BY le."createdAt" DESC, le."id" DESC
               LIMIT 1
             ),0) AS balance
      FROM "ledger_accounts" la
      WHERE la."partyType"='VENDOR'
    )
    SELECT v."id", v."name", COALESCE(ds.outstanding,0)::numeric AS outstanding,
           COALESCE(dp.deposit_balance,0)::numeric AS deposit_balance,
           COALESCE(l.balance,0)::numeric AS ledger_balance,
           (COALESCE(ds.outstanding,0)-COALESCE(dp.deposit_balance,0)-COALESCE(l.balance,0))::numeric AS gap
    FROM "vendors" v
    LEFT JOIN debt_sum ds ON ds.vendor_id=v."id"
    LEFT JOIN dep_sum dp ON dp.vendor_id=v."id"
    LEFT JOIN led l ON l.vendor_id=v."id"
    WHERE (COALESCE(ds.outstanding,0) > 0 OR COALESCE(dp.deposit_balance,0) > 0)
      AND COALESCE(l.balance,0) <> (COALESCE(ds.outstanding,0)-COALESCE(dp.deposit_balance,0))
    ORDER BY ABS(COALESCE(ds.outstanding,0)-COALESCE(dp.deposit_balance,0)-COALESCE(l.balance,0)) DESC
  `)
  console.log(rows)
}

main().finally(async()=>{ await prisma.$disconnect() })
