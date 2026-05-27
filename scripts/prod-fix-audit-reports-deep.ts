import "dotenv/config"
import { prisma } from "../src/lib/prisma"
import { getSalesReport, getProductReport, getDebtReport, getProfitReport } from "../src/features/reports/services/report.service"
import { startOfDayWIB, endOfDayWIB } from "../src/lib/timezone"

type NumRow = { value: number | string | bigint | null }

function toNum(v: number | string | bigint | null | undefined): number {
  if (v === null || v === undefined) return 0
  if (typeof v === "number") return v
  if (typeof v === "bigint") return Number(v)
  return Number(v)
}

async function scalar(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<NumRow[]>(sql)
  return toNum(rows[0]?.value)
}

function almostEqual(a: number, b: number, eps = 0.0001): boolean {
  return Math.abs(a - b) <= eps
}

async function main() {
  console.log("=== PROD FIX AUDIT REPORTS (DEEP) ===")
  console.log(`Time: ${new Date().toISOString()}`)

  const bounds = await prisma.transaction.aggregate({
    where: { confirmationStatus: "CONFIRMED" },
    _min: { transactionDate: true },
    _max: { transactionDate: true },
  })

  if (!bounds._min.transactionDate || !bounds._max.transactionDate) {
    console.log("Tidak ada transaksi CONFIRMED. Skip report cross-check.")
    return
  }

  const dateFrom = bounds._min.transactionDate.toISOString().slice(0, 10)
  const dateTo = bounds._max.transactionDate.toISOString().slice(0, 10)
  const fromTs = startOfDayWIB(new Date(dateFrom)).toISOString()
  const toTs = endOfDayWIB(new Date(dateTo)).toISOString()

  console.log(`Period check: ${dateFrom} s.d ${dateTo}`)

  const sales = await getSalesReport(dateFrom, dateTo, "day")
  const products = await getProductReport(dateFrom, dateTo)
  const debts = await getDebtReport()
  const profit = await getProfitReport(dateFrom, dateTo)

  const sqlSalesRevenue = await scalar(`
    SELECT COALESCE(SUM(t."totalAmount"),0)::numeric AS value
    FROM "transactions" t
    WHERE t."confirmationStatus"='CONFIRMED'
      AND t."transactionDate" >= '${fromTs}'::timestamptz
      AND t."transactionDate" <= '${toTs}'::timestamptz
  `)
  const sqlSalesCount = await scalar(`
    SELECT COUNT(*)::bigint AS value
    FROM "transactions" t
    WHERE t."confirmationStatus"='CONFIRMED'
      AND t."transactionDate" >= '${fromTs}'::timestamptz
      AND t."transactionDate" <= '${toTs}'::timestamptz
  `)
  const sqlCashFromTrx = await scalar(`
    SELECT COALESCE(SUM(t."paidAmount"),0)::numeric AS value
    FROM "transactions" t
    WHERE t."confirmationStatus"='CONFIRMED'
      AND t."transactionDate" >= '${fromTs}'::timestamptz
      AND t."transactionDate" <= '${toTs}'::timestamptz
  `)
  const sqlDebtPayments = await scalar(`
    SELECT COALESCE(SUM(cp."amount"),0)::numeric AS value
    FROM "customer_payments" cp
    WHERE cp."source"='DIRECT'
      AND cp."paymentDate" >= '${fromTs}'::timestamptz
      AND cp."paymentDate" <= '${toTs}'::timestamptz
  `)
  const sqlNewDebt = await scalar(`
    SELECT COALESCE(SUM(t."debtAmount"),0)::numeric AS value
    FROM "transactions" t
    WHERE t."confirmationStatus"='CONFIRMED'
      AND t."transactionDate" >= '${fromTs}'::timestamptz
      AND t."transactionDate" <= '${toTs}'::timestamptz
  `)

  const sqlProductQty = await scalar(`
    SELECT COALESCE(SUM(ti."quantity"),0)::numeric AS value
    FROM "transaction_items" ti
    JOIN "transactions" t ON t."id" = ti."transactionId"
    WHERE t."confirmationStatus"='CONFIRMED'
      AND t."transactionDate" >= '${fromTs}'::timestamptz
      AND t."transactionDate" <= '${toTs}'::timestamptz
  `)
  const sqlProductRevenue = await scalar(`
    SELECT COALESCE(SUM((ti."sellPrice" - ti."discountAmount") * ti."quantity"),0)::numeric AS value
    FROM "transaction_items" ti
    JOIN "transactions" t ON t."id" = ti."transactionId"
    WHERE t."confirmationStatus"='CONFIRMED'
      AND t."transactionDate" >= '${fromTs}'::timestamptz
      AND t."transactionDate" <= '${toTs}'::timestamptz
  `)
  const sqlProductProfit = await scalar(`
    SELECT COALESCE(SUM((ti."sellPrice" - ti."buyPrice") * ti."quantity"),0)::numeric AS value
    FROM "transaction_items" ti
    JOIN "transactions" t ON t."id" = ti."transactionId"
    WHERE t."confirmationStatus"='CONFIRMED'
      AND t."transactionDate" >= '${fromTs}'::timestamptz
      AND t."transactionDate" <= '${toTs}'::timestamptz
  `)

  const sqlDebtOutstanding = await scalar(`
    SELECT COALESCE(SUM(d."remainingAmount"),0)::numeric AS value
    FROM "debts" d
    WHERE d."status" IN ('UNPAID','PARTIAL')
  `)
  const sqlDebtCustomers = await scalar(`
    SELECT COUNT(DISTINCT d."customerId")::bigint AS value
    FROM "debts" d
    WHERE d."status" IN ('UNPAID','PARTIAL')
  `)

  const sqlPacking = await scalar(`
    SELECT COALESCE(SUM(t."packingFee"),0)::numeric AS value
    FROM "transactions" t
    WHERE t."confirmationStatus"='CONFIRMED'
      AND t."transactionDate" >= '${fromTs}'::timestamptz
      AND t."transactionDate" <= '${toTs}'::timestamptz
  `)
  const sqlHpp = await scalar(`
    SELECT COALESCE(SUM(ti."buyPrice" * ti."quantity"),0)::numeric AS value
    FROM "transaction_items" ti
    JOIN "transactions" t ON t."id" = ti."transactionId"
    WHERE t."confirmationStatus"='CONFIRMED'
      AND t."transactionDate" >= '${fromTs}'::timestamptz
      AND t."transactionDate" <= '${toTs}'::timestamptz
  `)

  const productAggQty = products.reduce((s, p) => s + p.totalQty, 0)
  const productAggRevenue = products.reduce((s, p) => s + p.totalRevenue, 0)
  const productAggProfit = products.reduce((s, p) => s + p.totalProfit, 0)

  const checks = [
    ["sales.totalRevenue", sales.totalRevenue, sqlSalesRevenue],
    ["sales.totalTransactions", sales.totalTransactions, sqlSalesCount],
    ["sales.totalDebtPaymentsReceived", sales.totalDebtPaymentsReceived, sqlDebtPayments],
    ["sales.totalNewDebt", sales.totalNewDebt, sqlNewDebt],
    ["sales.totalCashCollected", sales.totalCashCollected, sqlCashFromTrx + sqlDebtPayments],
    ["products.sumQty", productAggQty, sqlProductQty],
    ["products.sumRevenue", productAggRevenue, sqlProductRevenue],
    ["products.sumProfit", productAggProfit, sqlProductProfit],
    ["debts.totalOutstanding", debts.totalOutstanding, sqlDebtOutstanding],
    ["debts.totalCustomersWithDebt", debts.totalCustomersWithDebt, sqlDebtCustomers],
    ["profit.totalHPP", profit.totalHPP, sqlHpp],
    ["profit.totalRevenue", profit.totalRevenue, sqlProductRevenue + sqlPacking],
    ["profit.totalProfit", profit.totalProfit, (sqlProductRevenue + sqlPacking) - sqlHpp],
    ["profit.totalCashRevenue", profit.totalCashRevenue, sqlCashFromTrx + sqlDebtPayments],
    ["profit.totalDebtPaymentsReceived", profit.totalDebtPaymentsReceived, sqlDebtPayments],
    ["profit.totalNewDebt", profit.totalNewDebt, sqlNewDebt],
  ] as const

  let mismatch = 0
  console.log("\n-- Report Cross-check --")
  for (const [name, apiValue, sqlValue] of checks) {
    const ok = almostEqual(apiValue, sqlValue)
    if (!ok) mismatch++
    console.log(`${ok ? "OK  " : "FAIL"} ${name} | report=${apiValue} | sql=${sqlValue}`)
  }

  console.log(`\nTotal checks: ${checks.length}`)
  console.log(`Mismatch    : ${mismatch}`)
}

main()
  .catch((e) => {
    console.error("Report deep audit failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
