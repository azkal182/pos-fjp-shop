import { prisma } from "@/lib/prisma"
import { log } from "@/lib/logger"
import type { SettingGroup } from "@/generated/prisma"

export async function getAllSettings() {
  const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } })
  const grouped: Record<string, Record<string, string>> = {}
  for (const s of settings) {
    if (!grouped[s.group]) grouped[s.group] = {}
    grouped[s.group][s.key] = s.value
  }
  return grouped
}

export async function getByGroup(group: SettingGroup) {
  return prisma.setting.findMany({ where: { group } })
}

export async function getByKey(key: string) {
  return prisma.setting.findUnique({ where: { key } })
}

export async function updateSettings(updates: { key: string; value: string }[]) {
  for (const { key, value } of updates) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value, group: "STORE" }, // fallback group, seharusnya sudah ada
    })
  }
  log.info("[SETTING]", "Settings updated", { keys: updates.map((u) => u.key) })
  return getAllSettings()
}

export async function getStoreSettings() {
  const settings = await getByGroup("STORE")
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  return {
    storeName: map["store_name"] ?? "FJP Shop",
    storeAddress: map["store_address"] ?? "",
    storePhone: map["store_phone"] ?? "",
    receiptNote: map["store_receipt_note"] ?? "",
  }
}

export async function getPosSettings() {
  const setting = await getByKey("pos_payment_methods")
  const methods = (setting?.value ?? "CASH,TRANSFER").split(",").filter(Boolean)
  return { paymentMethods: methods }
}
