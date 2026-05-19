"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import type { PriceChange } from "../schemas/purchase.schema"

interface PriceChangeAlertProps {
  open: boolean
  changes: PriceChange[]
  onConfirm: (confirmedIds: string[]) => void
  onSkip: () => void
}

export function PriceChangeAlert({ open, changes, onConfirm, onSkip }: PriceChangeAlertProps) {
  const changedItems = changes.filter((c) => c.changed)
  const [selected, setSelected] = useState<Set<string>>(
    new Set(changedItems.map((c) => c.productId))
  )

  function toggle(productId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(productId) ? next.delete(productId) : next.add(productId)
      return next
    })
  }

  function handleConfirm() {
    onConfirm(Array.from(selected))
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onSkip()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Perubahan Harga Terdeteksi</DialogTitle>
          </div>
          <DialogDescription>
            Harga beli beberapa produk berbeda dari data terakhir. Pilih produk yang ingin diperbarui harganya.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {changedItems.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50 cursor-pointer"
              onClick={() => toggle(item.productId)}
            >
              <Checkbox
                checked={selected.has(item.productId)}
                onCheckedChange={() => toggle(item.productId)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.productName}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.productCode}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground line-through">
                  <CurrencyDisplay amount={item.previousBuyPrice} />
                </p>
                <p className="text-sm font-semibold text-green-600">
                  <CurrencyDisplay amount={item.newBuyPrice} />
                </p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onSkip}>
            Lewati Semua
          </Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0}>
            Update {selected.size > 0 ? `${selected.size} Harga` : "Harga"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
