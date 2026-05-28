import "dotenv/config"
import { prisma } from "../src/lib/prisma"

type Row = { value: number | string | bigint | null }

async function scalar(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Row[]>(sql)
  const v = rows[0]?.value
  if (v === null || v === undefined) return 0
  if (typeof v === "bigint") return Number(v)
  if (typeof v === "number") return v
  return Number(v)
}

async function main() {
  console.log("=== PROD FIX AUDIT FINANCE (DEEP) ===")
  console.log(`Time: ${new Date().toISOString()}`)

  const txDebtMismatch = await scalar(`
    SELECT COUNT(*)::bigint AS value
    FROM "transactions" t
    WHERE t."confirmationStatus"='CONFIRMED'
      AND COALESCE(t."debtAmount",0) <> GREATEST(0, COALESCE(t."totalAmount",0) - (COALESCE(t."paidAmount",0) + COALESCE(t."depositUsed",0)))
  `)

  const debtRowMismatch = await scalar(`
    SELECT COUNT(*)::bigint AS value
    FROM "debts" d
    WHERE COALESCE(d."remainingAmount",0) <> GREATEST(0, COALESCE(d."originalAmount",0) - COALESCE(d."paidAmount",0))
  `)

  const vendorDebtRowMismatch = await scalar(`
    SELECT COUNT(*)::bigint AS value
    FROM "vendor_debts" vd
    WHERE COALESCE(vd."remainingAmount",0) <> GREATEST(0, COALESCE(vd."originalAmount",0) - COALESCE(vd."paidAmount",0))
  `)

  const debtPaymentAllocMismatch = await scalar(`
    SELECT COUNT(*)::bigint AS value
    FROM (
      SELECT d."id", COALESCE(SUM(dp."amount"),0) AS paid_calc, COALESCE(d."paidAmount",0) AS paid_saved
      FROM "debts" d
      LEFT JOIN "debt_payments" dp ON dp."debtId" = d."id"
      GROUP BY d."id", d."paidAmount"
    ) x
    WHERE x.paid_calc <> x.paid_saved
  `)

  const vendorDebtPaymentAllocMismatch = await scalar(`
    SELECT COUNT(*)::bigint AS value
    FROM (
      SELECT vd."id", COALESCE(SUM(vdp."amount"),0) AS paid_calc, COALESCE(vd."paidAmount",0) AS paid_saved
      FROM "vendor_debts" vd
      LEFT JOIN "vendor_debt_payments" vdp ON vdp."debtId" = vd."id"
      GROUP BY vd."id", vd."paidAmount"
    ) x
    WHERE x.paid_calc <> x.paid_saved
  `)

  const depositBalanceMismatch = await scalar(`
    SELECT COUNT(*)::bigint AS value
    FROM "deposits" d
    WHERE COALESCE(d."balance",0) <> (COALESCE(d."amount",0) - COALESCE(d."usedAmount",0) - COALESCE(d."returnedAmount",0))
  `)

  const customerLedgerVsDebtMismatch = await scalar(`
    WITH debt_sum AS (
      SELECT customer_id, COALESCE(SUM(rem),0) AS outstanding
      FROM (
        SELECT d."customerId" AS customer_id, COALESCE(d."remainingAmount",0) AS rem
        FROM "debts" d
      ) z
      GROUP BY customer_id
    ),
    dep_sum AS (
      SELECT d."partyId" AS customer_id, COALESCE(SUM(d."balance"),0) AS deposit_balance
      FROM "deposits" d
      WHERE d."partyType"='CUSTOMER'
      GROUP BY d."partyId"
    ),
    led AS (
      SELECT la."partyId" AS customer_id,
             COALESCE((
               SELECT le."runningBalance"
               FROM "ledger_entries" le
               WHERE le."accountId" = la."id"
               ORDER BY le."createdAt" DESC, le."id" DESC
               LIMIT 1
             ),0) AS balance
      FROM "ledger_accounts" la
      WHERE la."partyType"='CUSTOMER'
    )
    SELECT COUNT(*)::bigint AS value
    FROM led
    LEFT JOIN debt_sum d ON d.customer_id = led.customer_id
    LEFT JOIN dep_sum dp ON dp.customer_id = led.customer_id
    WHERE (COALESCE(d.outstanding,0) > 0 OR COALESCE(dp.deposit_balance,0) > 0)
      AND ROUND(COALESCE(led.balance,0)::numeric, 2) <> ROUND((COALESCE(d.outstanding,0) - COALESCE(dp.deposit_balance,0))::numeric, 2)
  `)

  const vendorLedgerVsDebtMismatch = await scalar(`
    WITH debt_sum AS (
      SELECT vendor_id, COALESCE(SUM(rem),0) AS outstanding
      FROM (
        SELECT vd."vendorId" AS vendor_id, COALESCE(vd."remainingAmount",0) AS rem
        FROM "vendor_debts" vd
      ) z
      GROUP BY vendor_id
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
    SELECT COUNT(*)::bigint AS value
    FROM led
    LEFT JOIN debt_sum d ON d.vendor_id = led.vendor_id
    LEFT JOIN dep_sum dp ON dp.vendor_id = led.vendor_id
    WHERE (COALESCE(d.outstanding,0) > 0 OR COALESCE(dp.deposit_balance,0) > 0)
      AND ROUND(COALESCE(led.balance,0)::numeric, 2) <> ROUND((COALESCE(d.outstanding,0) - COALESCE(dp.deposit_balance,0))::numeric, 2)
  `)

  console.log("\n-- Deep Finance Integrity --")
  console.log(`Transaction debt formula mismatch     : ${txDebtMismatch}`)
  console.log(`Debt row mismatch (orig-paid-remain)  : ${debtRowMismatch}`)
  console.log(`Vendor debt row mismatch              : ${vendorDebtRowMismatch}`)
  console.log(`Debt payment allocation mismatch      : ${debtPaymentAllocMismatch}`)
  console.log(`Vendor debt allocation mismatch       : ${vendorDebtPaymentAllocMismatch}`)
  console.log(`Deposit balance formula mismatch      : ${depositBalanceMismatch}`)
  console.log(`Customer ledger vs debt mismatch      : ${customerLedgerVsDebtMismatch}`)
  console.log(`Vendor ledger vs debt mismatch        : ${vendorLedgerVsDebtMismatch}`)
}

main()
  .catch((e) => {
    console.error("Finance deep audit failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
