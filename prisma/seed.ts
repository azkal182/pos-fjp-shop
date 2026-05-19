import "dotenv/config"
import { auth } from "../src/lib/auth"
import { prisma } from "../src/lib/prisma"

async function main() {
  console.log("🌱 Seeding database...")

  // ─── Settings ───────────────────────────────────────────────────────────────
  const settings = [
    { key: "store_name", value: "FJP Shop", group: "STORE" as const, label: "Nama Toko" },
    { key: "store_address", value: "", group: "STORE" as const, label: "Alamat Toko" },
    { key: "store_phone", value: "", group: "STORE" as const, label: "No. HP Toko" },
    { key: "store_receipt_note", value: "", group: "STORE" as const, label: "Catatan Struk" },
    { key: "pos_payment_methods", value: "CASH,TRANSFER", group: "POS" as const, label: "Metode Bayar" },
  ]

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log("✅ Settings seeded")

  // ─── Debt Aging Categories ───────────────────────────────────────────────────
  const agingCategories = [
    { name: "Lancar",    minDays: 0,  maxDays: 30,   color: "#22c55e", order: 1 },
    { name: "Perhatian", minDays: 31, maxDays: 60,   color: "#f59e0b", order: 2 },
    { name: "Kritis",    minDays: 61, maxDays: 90,   color: "#ef4444", order: 3 },
    { name: "Macet",     minDays: 91, maxDays: null,  color: "#7f1d1d", order: 4 },
  ]

  const existingAgingCount = await prisma.debtAgingCategory.count()
  if (existingAgingCount === 0) {
    await prisma.debtAgingCategory.createMany({ data: agingCategories })
    console.log("✅ Debt aging categories seeded")
  } else {
    console.log("⏭️  Debt aging categories already exist, skipping")
  }

  // ─── Admin User ──────────────────────────────────────────────────────────────
  const adminEmail    = process.env.SEED_ADMIN_EMAIL    ?? "admin@fjpshop.com"
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123456"
  const adminName     = process.env.SEED_ADMIN_NAME     ?? "Admin"

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } })

  if (existingUser) {
    console.log(`⏭️  User "${adminEmail}" already exists, skipping`)
  } else {
    const result = await auth.api.signUpEmail({
      body: {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
      },
    })

    if (result.user) {
      console.log(`✅ Admin user created: ${result.user.email}`)
      console.log(`   Email   : ${adminEmail}`)
      console.log(`   Password: ${adminPassword}`)
    } else {
      console.warn("⚠️  signUpEmail returned no user — check Better Auth config")
    }
  }

  console.log("🎉 Seeding complete!")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
