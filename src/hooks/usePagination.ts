"use client"

import { useState } from "react"

export function usePagination(initialLimit = 20) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(initialLimit)

  function reset() {
    setPage(1)
  }

  function handleSetLimit(newLimit: number) {
    setLimit(newLimit)
    setPage(1)
  }

  return { page, limit, setPage, setLimit: handleSetLimit, reset }
}
