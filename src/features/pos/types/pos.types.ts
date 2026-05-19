export interface CartItem {
  productId: string
  productCode: string
  productName: string
  unit: string
  sellPrice: number
  buyPrice: number
  stock: number
  quantity: number
  discountAmount: number
  subtotal: number
}

export interface CheckoutPayload {
  customerId?: string
  items: {
    productId: string
    quantity: number
    sellPrice: number
    discountAmount: number
  }[]
  paidAmount: number
  paymentMethod: "CASH" | "TRANSFER"
  discountAmount: number
  notes?: string
}
