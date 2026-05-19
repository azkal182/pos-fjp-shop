import { NextResponse } from "next/server"
import { AppError } from "./exceptions"
import { log } from "./logger"
import type { ApiResponse, PaginatedResponse, PaginationMeta } from "@/types"

export function successResponse<T>(data: T, status = 200): NextResponse {
  const body: ApiResponse<T> = { success: true, data }
  return NextResponse.json(body, { status })
}

export function errorResponse(message: string, status = 500): NextResponse {
  const body: ApiResponse = { success: false, error: message }
  return NextResponse.json(body, { status })
}

export function paginatedResponse<T>(
  data: T[],
  meta: PaginationMeta
): NextResponse {
  const body: PaginatedResponse<T> = { success: true, data, meta }
  return NextResponse.json(body)
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return errorResponse(error.message, error.statusCode)
  }

  // Prisma unique constraint violation
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  ) {
    return errorResponse("Data sudah ada (duplikat)", 409)
  }

  // Prisma record not found
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2025"
  ) {
    return errorResponse("Data tidak ditemukan", 404)
  }

  log.error("[API]", "Unhandled error", error)
  return errorResponse("Terjadi kesalahan pada server", 500)
}

export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}
