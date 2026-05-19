export interface DebtAllocation {
  debtId: string
  debtCode: string
  debtDate: Date
  originalAmount: number
  currentRemaining: number
  allocatedAmount: number
  willBeFullyPaid: boolean
  remainingAfter: number
}

export interface AllocationResult {
  allocations: DebtAllocation[]
  totalAllocated: number
  remainingChange: number
  customerPaymentId: string
}

export interface FifoPreview {
  allocations: DebtAllocation[]
  totalAllocated: number
  remainingChange: number
}
