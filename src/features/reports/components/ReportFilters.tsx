"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/shared/DateRangePicker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { subDays } from "date-fns"

interface Category { id: string; name: string }

interface ReportFiltersProps {
  onFilter: (filters: {
    dateFrom?: Date
    dateTo?: Date
    groupBy?: string
    categoryId?: string
  }) => void
  showGroupBy?: boolean
  showCategory?: boolean
}

export function ReportFilters({ onFilter, showGroupBy, showCategory }: ReportFiltersProps) {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 29),
    to: new Date(),
  })
  const [groupBy, setGroupBy] = useState("day")
  const [categoryId, setCategoryId] = useState("")
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    if (showCategory) {
      fetch("/api/categories")
        .then((r) => r.json())
        .then((json) => setCategories(json.data ?? []))
        .catch(() => {})
    }
  }, [showCategory])

  // Apply filter on mount
  useEffect(() => {
    onFilter({ dateFrom: dateRange.from, dateTo: dateRange.to, groupBy, categoryId: categoryId || undefined })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleApply() {
    onFilter({
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      groupBy: showGroupBy ? groupBy : undefined,
      categoryId: showCategory && categoryId ? categoryId : undefined,
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <DateRangePicker
        value={dateRange}
        onChange={setDateRange}
        placeholder="Pilih rentang tanggal"
        className="w-64"
      />
      {showGroupBy && (
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Per Hari</SelectItem>
            <SelectItem value="week">Per Minggu</SelectItem>
            <SelectItem value="month">Per Bulan</SelectItem>
          </SelectContent>
        </Select>
      )}
      {showCategory && (
        <Select value={categoryId || "all"} onValueChange={(v) => setCategoryId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button onClick={handleApply} size="sm">Terapkan</Button>
    </div>
  )
}
