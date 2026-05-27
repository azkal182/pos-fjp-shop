import "dotenv/config"
import { prisma } from "../src/lib/prisma"

type StockRow = {
  productId: string
  code: string
  name: string
  stock: number
  expectedStock: number
}

async function main() {
  console.log("=== PROD FIX AUDIT STOCK (DEEP) ===")
  console.log(`Time: ${new Date().toISOString()}`)

  const rows = await prisma.$queryRawUnsafe<StockRow[]>(`
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

  const mismatches = rows.filter((r) => Number(r.stock) !== Number(r.expectedStock))

  console.log("\n-- Summary --")
  console.log(`Total products checked: ${rows.length}`)
  console.log(`Mismatch products     : ${mismatches.length}`)

  if (mismatches.length > 0) {
    console.log("\n-- Top Mismatch (max 30) --")
    for (const row of mismatches.slice(0, 30)) {
      const diff = Number(row.stock) - Number(row.expectedStock)
      console.log(`${row.code} | ${row.name} | stock=${row.stock} expected=${row.expectedStock} diff=${diff}`)
    }
  }

  const negativeStock = rows.filter((r) => Number(r.stock) < 0)
  console.log("\n-- Extra Checks --")
  console.log(`Negative stock products: ${negativeStock.length}`)
}

main()
  .catch((e) => {
    console.error("Stock audit failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
