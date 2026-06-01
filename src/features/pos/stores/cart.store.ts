import { create } from "zustand"
import type { CartItem } from "../types/pos.types"

interface CartState {
  // State
  items: CartItem[]
  customerId: string | null
  customerName: string | null
  customerHasDebt: boolean
  customerOutstandingDebt: number
  walkInSelected: boolean
  discountAmount: number
  paymentMethod: "CASH" | "TRANSFER"
  paidAmount: number

  // Actions
  addItem: (product: Omit<CartItem, "subtotal">) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  updateItemDiscount: (productId: string, discount: number) => void
  setCustomer: (customerId: string, customerName: string, hasDebt: boolean, outstandingDebt: number) => void
  setWalkIn: () => void
  clearCustomer: () => void
  setDiscount: (amount: number) => void
  setPaymentMethod: (method: "CASH" | "TRANSFER") => void
  setPaidAmount: (amount: number) => void
  clearCart: () => void

  // Computed getters
  subtotal: () => number
  totalAmount: () => number
  debtAmount: () => number
  overpayAmount: () => number
  changeAmount: () => number
  isWalkIn: () => boolean
}

function calcSubtotal(item: CartItem): number {
  return (item.sellPrice - item.discountAmount) * item.quantity
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  customerName: null,
  customerHasDebt: false,
  customerOutstandingDebt: 0,
  walkInSelected: false,
  discountAmount: 0,
  paymentMethod: "CASH",
  paidAmount: 0,

  addItem: (product) => {
    set((state) => {
      const incomingQty = Math.max(1, product.quantity)
      const existing = state.items.find((i) => i.productId === product.productId)
      if (existing) {
        const nextQty = existing.quantity + incomingQty
        return {
          items: state.items.map((i) =>
            i.productId === product.productId
              ? { ...i, quantity: nextQty, subtotal: calcSubtotal({ ...i, quantity: nextQty }) }
              : i
          ),
        }
      }
      const newItem: CartItem = {
        ...product,
        quantity: incomingQty,
        discountAmount: product.discountAmount ?? 0,
        subtotal: calcSubtotal({ ...product, quantity: incomingQty, discountAmount: product.discountAmount ?? 0, subtotal: 0 }),
      }
      return { items: [...state.items, newItem] }
    })
  },

  removeItem: (productId) => {
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }))
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId)
      return
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId
          ? { ...i, quantity: qty, subtotal: calcSubtotal({ ...i, quantity: qty }) }
          : i
      ),
    }))
  },

  updateItemDiscount: (productId, discount) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId
          ? { ...i, discountAmount: discount, subtotal: calcSubtotal({ ...i, discountAmount: discount }) }
          : i
      ),
    }))
  },

  setCustomer: (customerId, customerName, hasDebt, outstandingDebt) => {
    set({
      customerId,
      customerName,
      customerHasDebt: hasDebt,
      customerOutstandingDebt: outstandingDebt,
      walkInSelected: false,
    })
  },

  setWalkIn: () => {
    set({
      customerId: null,
      customerName: "Walk-in",
      customerHasDebt: false,
      customerOutstandingDebt: 0,
      walkInSelected: true,
    })
  },

  clearCustomer: () => {
    set({
      customerId: null,
      customerName: null,
      customerHasDebt: false,
      customerOutstandingDebt: 0,
      walkInSelected: false,
    })
  },

  setDiscount: (amount) => set({ discountAmount: amount }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setPaidAmount: (amount) => set({ paidAmount: amount }),

  clearCart: () => {
    set({
      items: [],
      customerId: null,
      customerName: null,
      customerHasDebt: false,
      customerOutstandingDebt: 0,
      walkInSelected: false,
      discountAmount: 0,
      paymentMethod: "CASH",
      paidAmount: 0,
    })
  },

  subtotal: () => get().items.reduce((sum, i) => sum + i.subtotal, 0),
  totalAmount: () => get().subtotal() - get().discountAmount,
  debtAmount: () => Math.max(0, get().totalAmount() - get().paidAmount),
  overpayAmount: () => Math.max(0, get().paidAmount - get().totalAmount()),
  changeAmount: () => {
    const overpay = get().overpayAmount()
    if (overpay <= 0) return 0
    return get().customerHasDebt ? 0 : overpay
  },
  isWalkIn: () => get().walkInSelected,
}))
