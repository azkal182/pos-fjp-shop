"use client"

import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/useDebounce"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface SearchInputProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export function SearchInput({
  value = "",
  onChange,
  placeholder = "Cari...",
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const debouncedValue = useDebounce(localValue, debounceMs)

  useEffect(() => {
    onChange(debouncedValue)
  }, [debouncedValue]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
          onClick={() => {
            setLocalValue("")
            onChange("")
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
