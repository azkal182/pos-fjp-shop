import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Seeding database...")

  // Default Settings
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

  // Default Debt Aging Categories
  const agingCategories = [
    { name: "Lancar", minDays: 0, maxDays: 30, color: "#22c55e", order: 1 },
    { name: "Perhatian", minDays: 31, maxDays: 60, color: "#f59e0b", order: 2 },
    { name: "Kritis", minDays: 61, maxDays: 90, color: "#ef4444", order: 3 },
    { name: "Macet", minDays: 91, maxDays: null, color: "#7f1d1d", order: 4 },
  ]

  // Only seed if no categories exist
  const existingCount = await prisma.debtAgingCategory.count()
  if (existingCount === 0) {
    await prisma.debtAgingCategory.createMany({ data: agingCategories })
    console.log("✅ Debt aging categories seeded")
  } else {
    console.log("⏭️  Debt aging categories already exist, skipping")
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
