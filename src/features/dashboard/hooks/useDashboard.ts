"use client"

import { useState, useEffect, useCallback } from "react"
import type { DashboardData } from "../types/dashboard.types"

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/dashboard")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat dashboard")
      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
    // Auto-refresh setiap 5 menit
    const interval = setInterval(refetch, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [refetch])

  return { data, isLoading, error, refetch }
}
