import "dotenv/config"
import { prisma } from "../src/lib/prisma"

type StockRow = {
  productId: string
  code: string
  name: string
  stock: number
  expectedStock: number
}

function hasApplyFlag() {
  return process.argv.includes("--apply")
}

async function fetchRows() {
  return prisma.$queryRawUnsafe<StockRow[]>(`
    WITH movement AS (
      SELECT
        sm."productId",
        COALESCE(SUM(
          CASE
            WHEN sm."type" IN ('PURCHASE_IN','ADJUSTMENT_IN') THEN sm."quantity"
            WHEN sm."type" IN ('SALE_OUT','ADJUSTMENT_OUT') THEN -sm."quantity"
            ELSE 0
          END
        ), 0) AS expected_stock
      FROM "stock_movements" sm
      GROUP BY sm."productId"
    )
    SELECT
      p."id" AS "productId",
      p."code",
      p."name",
      p."stock",
      COALESCE(m.expected_stock, 0)::int AS "expectedStock"
    FROM "products" p
    LEFT JOIN movement m ON m."productId" = p."id"
    ORDER BY p."name" ASC
  `)
}

async function main() {
  const apply = hasApplyFlag()
  console.log("=== PROD FIX APPLY STOCK REBUILD ===")
  console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN"}`)
  console.log(`Time: ${new Date().toISOString()}`)

  const before = await fetchRows()
  const mismatches = before.filter((r) => Number(r.stock) !== Number(r.expectedStock))

  console.log("\n-- Before --")
  console.log(`Total products checked: ${before.length}`)
  console.log(`Mismatch products     : ${mismatches.length}`)

  if (mismatches.length > 0) {
    console.log("\nTop mismatch (max 20):")
    for (const row of mismatches.slice(0, 20)) {
      const diff = Number(row.stock) - Number(row.expectedStock)
      console.log(`${row.code} | ${row.name} | stock=${row.stock} expected=${row.expectedStock} diff=${diff}`)
    }
  }

  if (!apply) {
    console.log("\nNo data changed. Run with --apply to update products.stock.")
    return
  }

  await prisma.$transaction(async (tx) => {
    for (const row of mismatches) {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: row.productId },
        select: { stock: true },
      })
      const current = Number(product.stock)
      const expected = Number(row.expectedStock)
      const delta = expected - current
      if (delta === 0) continue

      await tx.stockMovement.create({
        data: {
          productId: row.productId,
          type: delta > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
          quantity: delta,
          stockBefore: current,
          stockAfter: expected,
          referenceCode: "AUTO-REBUILD-STOCK",
          notes: `AUTO_REBUILD_STOCK expected=${expected} before=${current}`,
        },
      })

      await tx.product.update({
        where: { id: row.productId },
        data: { stock: expected },
      })
    }
  }, 
{
    maxWait: 10000, // Wait up to 10 seconds to catch a free database connection
    timeout: 30000, // Allow the transaction to run for up to 30 seconds
  }
)

  const after = await fetchRows()
  const afterMismatch = after.filter((r) => Number(r.stock) !== Number(r.expectedStock))

  console.log("\n-- After --")
  console.log(`Mismatch products: ${afterMismatch.length}`)
  console.log("Stock rebuild completed.")
}

main()
  .catch((e) => {
    console.error("Stock rebuild failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
