"use client"

import { useState } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateRangePickerProps {
  value?: { from?: Date; to?: Date }
  onChange: (range: { from?: Date; to?: Date }) => void
  placeholder?: string
  className?: string
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pilih rentang tanggal",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  const range: DateRange | undefined =
    value?.from || value?.to
      ? { from: value.from, to: value.to }
      : undefined

  function handleSelect(selected: DateRange | undefined) {
    onChange({ from: selected?.from, to: selected?.to })
    if (selected?.from && selected?.to) setOpen(false)
  }

  const label =
    range?.from
      ? range.to
        ? `${format(range.from, "dd MMM yyyy", { locale: id })} – ${format(range.to, "dd MMM yyyy", { locale: id })}`
        : format(range.from, "dd MMM yyyy", { locale: id })
      : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !range && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={2}
          locale={id}
        />
        {range && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange({})
                setOpen(false)
              }}
            >
              Reset
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
