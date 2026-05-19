"use client"

import { create } from "zustand"

interface StoreSettings {
  storeName: string
  storeAddress: string
  storePhone: string
  receiptNote: string
}

interface PosSettings {
  paymentMethods: string[]
}

interface SettingsState {
  store: StoreSettings
  pos: PosSettings
  isLoaded: boolean
  load: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  store: { storeName: "FJP Shop", storeAddress: "", storePhone: "", receiptNote: "" },
  pos: { paymentMethods: ["CASH", "TRANSFER"] },
  isLoaded: false,

  load: async () => {
    if (get().isLoaded) return
    try {
      const res = await fetch("/api/settings")
      const json = await res.json()
      const data = json.data ?? {}
      const storeData = data.STORE ?? {}
      const posData = data.POS ?? {}

      set({
        store: {
          storeName: storeData["store_name"] ?? "FJP Shop",
          storeAddress: storeData["store_address"] ?? "",
          storePhone: storeData["store_phone"] ?? "",
          receiptNote: storeData["store_receipt_note"] ?? "",
        },
        pos: {
          paymentMethods: (posData["pos_payment_methods"] ?? "CASH,TRANSFER").split(",").filter(Boolean),
        },
        isLoaded: true,
      })
    } catch {}
  },
}))
