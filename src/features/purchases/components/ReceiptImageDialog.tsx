"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ImageIcon } from "lucide-react"

interface ReceiptImageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string
  purchaseCode: string
}

export function ReceiptImageDialog({
  open,
  onOpenChange,
  imageUrl,
  purchaseCode,
}: ReceiptImageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Nota Vendor — {purchaseCode}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center rounded-lg border bg-muted/20 overflow-hidden min-h-[200px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`Nota ${purchaseCode}`}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
        <p className="text-xs text-center text-muted-foreground">
          Klik di luar dialog untuk menutup
        </p>
      </DialogContent>
    </Dialog>
  )
}
