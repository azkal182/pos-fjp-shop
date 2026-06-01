import "dotenv/config"
import { prisma } from "../src/lib/prisma"

type Row = {
  productId: string
  code: string
  name: string
  currentStock: number
  expectedStock: number
  delta: number
}

function hasApplyFlag() {
  return process.argv.includes("--apply")
}

async function getRows() {
  return prisma.$queryRawUnsafe<Row[]>(`
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
    )
    SELECT
      p."id" AS "productId",
      p."code",
      p."name",
      p."stock"::int AS "currentStock",
      (COALESCE(b.buy_qty, 0) - COALESCE(s.sell_qty, 0) + COALESCE(a.adj_qty, 0))::int AS "expectedStock",
      ((COALESCE(b.buy_qty, 0) - COALESCE(s.sell_qty, 0) + COALESCE(a.adj_qty, 0)) - p."stock")::int AS "delta"
    FROM "products" p
    LEFT JOIN buy b ON b."productId" = p."id"
    LEFT JOIN sell s ON s."productId" = p."id"
    LEFT JOIN adj a ON a."productId" = p."id"
    ORDER BY ABS((COALESCE(b.buy_qty, 0) - COALESCE(s.sell_qty, 0) + COALESCE(a.adj_qty, 0)) - p."stock") DESC, p."name" ASC
  `)
}

async function main() {
  const apply = hasApplyFlag()
  const now = new Date()
  const ref = `AUTO-RECON-${now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`

  console.log("=== PROD FIX APPLY STOCK (DOCS BASIS) ===")
  console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN"}`)
  console.log(`Time: ${now.toISOString()}`)
  console.log("Basis: purchase_items - confirmed transaction_items + manual adjustments (exclude AUTO-RECON)")

  const before = await getRows()
  const mismatch = before.filter((r) => Number(r.delta) !== 0)

  console.log("\n-- Before --")
  console.log(`Total products checked      : ${before.length}`)
  console.log(`Products mismatch (delta!=0): ${mismatch.length}`)
  console.log(`Total abs delta             : ${mismatch.reduce((s, r) => s + Math.abs(Number(r.delta)), 0)}`)

  if (mismatch.length > 0) {
    console.log("\nTop mismatch (max 30):")
    for (const r of mismatch.slice(0, 30)) {
      console.log(`${r.code} | stock=${r.currentStock} expected=${r.expectedStock} delta=${r.delta}`)
    }
  }

  if (!apply) {
    console.log("\nNo data changed. Run with --apply to create ADJUSTMENT movements.")
    return
  }

  let appliedCount = 0
  await prisma.$transaction(async (tx) => {
    for (const r of mismatch) {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: r.productId },
        select: { stock: true },
      })

      const current = Number(product.stock)
      const delta = Number(r.expectedStock) - current
      if (delta === 0) continue

      const type = delta > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT"
      const qty = delta // createMovement semantics: +in, -out
      const stockAfter = current + qty

      await tx.stockMovement.create({
        data: {
          productId: r.productId,
          type,
          quantity: qty,
          stockBefore: current,
          stockAfter,
          referenceCode: ref,
          notes: `AUTO_RECONCILE_STOCK docs-basis (expected=${r.expectedStock}, before=${current})`,
        },
      })

      await tx.product.update({
        where: { id: r.productId },
        data: { stock: stockAfter },
      })

      appliedCount++
    }
  }, {
    maxWait: 10000,
    timeout: 120000,
  })

  const after = await getRows()
  const mismatchAfter = after.filter((r) => Number(r.delta) !== 0)

  console.log("\n-- After --")
  console.log(`Adjustment rows created      : ${appliedCount}`)
  console.log(`Remaining mismatch products  : ${mismatchAfter.length}`)
  console.log(`Reference code               : ${ref}`)
}

main()
  .catch((e) => {
    console.error("Stock docs apply failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
