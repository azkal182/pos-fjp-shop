import "dotenv/config"
import { prisma } from "../src/lib/prisma"

type Row = {
  productId: string
  code: string
  name: string
  currentStock: number
  expectedStock: number
  delta: number
  movementCount: number
  chainBreakCount: number
}

async function main() {
  console.log("=== PROD FIX AUDIT STOCK (DOCS BASIS) ===")
  console.log(`Time: ${new Date().toISOString()}`)
  console.log("Basis: purchase_items - confirmed transaction_items + manual adjustments (exclude AUTO-RECON)")

  const rows = await prisma.$queryRawUnsafe<Row[]>(`
    WITH buy AS (
      SELECT pi."productId", COALESCE(SUM(pi."quantity"), 0)::int AS buy_qty
      FROM "purchase_items" pi
      GROUP BY pi."productId"
    ),
    sell AS (
      SELECT ti."productId", COALESCE(SUM(ti."quantity"), 0)::int AS sell_qty
      FROM "transaction_items" ti
      JOIN "transactions" t ON t."id" = ti."transactionId"
      WHERE t."confirmationStatus" = 'CONFIRMED'
      GROUP BY ti."productId"
    ),
    adj AS (
      SELECT sm."productId",
        COALESCE(SUM(
          CASE
            WHEN sm."type" IN ('ADJUSTMENT_IN','ADJUSTMENT_OUT') THEN sm."quantity"
            ELSE 0
          END
        ), 0)::int AS adj_qty
      FROM "stock_movements" sm
      WHERE COALESCE(sm."referenceCode", '') NOT LIKE 'AUTO-RECON-%'
        AND COALESCE(sm."notes", '') NOT ILIKE 'AUTO_RECONCILE_STOCK%'
      GROUP BY sm."productId"
    ),
    m AS (
      SELECT
        sm."productId",
        sm."id",
        sm."stockBefore",
        sm."stockAfter",
        sm."createdAt",
        LAG(sm."stockAfter") OVER (
          PARTITION BY sm."productId"
          ORDER BY sm."createdAt" ASC, sm."id" ASC
        ) AS prev_after
      FROM "stock_movements" sm
    ),
    chain AS (
      SELECT
        m."productId",
        COUNT(*)::int AS movement_count,
        COUNT(*) FILTER (
          WHERE m.prev_after IS NOT NULL AND m.prev_after <> m."stockBefore"
        )::int AS break_count
      FROM m
      GROUP BY m."productId"
    )
    SELECT
      p."id" AS "productId",
      p."code",
      p."name",
      p."stock"::int AS "currentStock",
      (COALESCE(b.buy_qty, 0) - COALESCE(s.sell_qty, 0) + COALESCE(a.adj_qty, 0))::int AS "expectedStock",
      ((COALESCE(b.buy_qty, 0) - COALESCE(s.sell_qty, 0) + COALESCE(a.adj_qty, 0)) - p."stock")::int AS "delta",
      COALESCE(c.movement_count, 0)::int AS "movementCount",
      COALESCE(c.break_count, 0)::int AS "chainBreakCount"
    FROM "products" p
    LEFT JOIN buy b ON b."productId" = p."id"
    LEFT JOIN sell s ON s."productId" = p."id"
    LEFT JOIN adj a ON a."productId" = p."id"
    LEFT JOIN chain c ON c."productId" = p."id"
    ORDER BY ABS((COALESCE(b.buy_qty, 0) - COALESCE(s.sell_qty, 0) + COALESCE(a.adj_qty, 0)) - p."stock") DESC, p."name" ASC
  `)

  const mismatch = rows.filter((r) => Number(r.delta) !== 0)
  const withBreak = rows.filter((r) => Number(r.chainBreakCount) > 0)

  console.log("\n-- Summary --")
  console.log(`Total products checked      : ${rows.length}`)
  console.log(`Products mismatch (delta!=0): ${mismatch.length}`)
  console.log(`Products chain-break        : ${withBreak.length}`)

  if (mismatch.length > 0) {
    console.log("\n-- Top mismatch (max 30) --")
    for (const r of mismatch.slice(0, 30)) {
      console.log(
        `${r.code} | stock=${r.currentStock} expected=${r.expectedStock} delta=${r.delta} | movements=${r.movementCount} breaks=${r.chainBreakCount}`
      )
    }
  }
}

main()
  .catch((e) => {
    console.error("Stock docs audit failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
