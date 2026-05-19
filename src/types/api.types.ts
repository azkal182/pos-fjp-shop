export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T = unknown> {
  success: boolean
  data: T[]
  error?: string
  meta: PaginationMeta
}
