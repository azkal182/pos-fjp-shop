import "dotenv/config"
import { auth } from "../src/lib/auth"
import { prisma } from "../src/lib/prisma"

async function main() {
  console.log("🌱 Seeding production database (config + admin only)...")

  // ── 0. Reset semua data ──────────────────────────────────────────────────────
  console.log("🧹 Resetting all data...")
  await prisma.depositUsage.deleteMany()
  await prisma.deposit.deleteMany()
  await prisma.ledgerEntry.deleteMany()
  await prisma.ledgerAccount.deleteMany()
  await prisma.vendorDebtPayment.deleteMany()
  await prisma.vendorPayment.deleteMany()
  await prisma.vendorDebt.deleteMany()
  await prisma.productVendorPrice.deleteMany()
  await prisma.customerPayment.deleteMany()
  await prisma.debtPayment.deleteMany()
  await prisma.debt.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.transactionItem.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.purchaseItem.deleteMany()
  await prisma.purchase.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.vendor.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.debtAgingCategory.deleteMany()
  await prisma.setting.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.verification.deleteMany()
  await prisma.user.deleteMany()
  console.log("✅ All data cleared")

  // ── 1. Settings ──────────────────────────────────────────────────────────────
  const settings = [
    { key: "store_name", value: "FJP Shop", group: "STORE" as const, label: "Nama Toko" },
    { key: "store_address", value: "", group: "STORE" as const, label: "Alamat Toko" },
    { key: "store_phone", value: "", group: "STORE" as const, label: "No. HP Toko" },
    { key: "store_receipt_note", value: "Terima kasih telah berbelanja!", group: "STORE" as const, label: "Catatan Struk" },
    { key: "store_logo_url", value: "", group: "STORE" as const, label: "URL Logo Nota" },
    { key: "pos_payment_methods", value: "CASH,TRANSFER", group: "POS" as const, label: "Metode Bayar" },
    { key: "printer_receipt_width", value: "80mm", group: "PRINTER" as const, label: "Lebar Kertas Thermal" },
  ]
  for (const s of settings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s })
  }
  console.log("✅ Settings")

  // ── 2. Debt Aging Categories ─────────────────────────────────────────────────
  await prisma.debtAgingCategory.createMany({
    data: [
      { name: "Lancar", minDays: 0, maxDays: 30, color: "#22c55e", order: 1 },
      { name: "Perhatian", minDays: 31, maxDays: 60, color: "#f59e0b", order: 2 },
      { name: "Kritis", minDays: 61, maxDays: 90, color: "#ef4444", order: 3 },
      { name: "Macet", minDays: 91, maxDays: null, color: "#7f1d1d", order: 4 },
    ],
  })
  console.log("✅ Debt aging categories")

  // ── 3. Admin User ────────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@fjpshop.com"
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123456"
  await auth.api.signUpEmail({
    body: { name: "Admin", email: adminEmail, password: adminPassword },
  })
  console.log(`✅ Admin user created: ${adminEmail}`)

  console.log("\n🎉 Production seed complete!")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
