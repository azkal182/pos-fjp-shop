"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"

interface VendorPaymentRow {
  id: string
  amount: string | number
  paymentDate: string
  source: "DIRECT" | "POS_OVERPAYMENT"
  paymentMethod: "CASH" | "TRANSFER"
  notes: string | null
  allocations: { id: string; amount: string | number; debt: { purchase: { code: string } } }[]
}

export function VendorPaymentHistory({ vendorId, refreshKey }: { vendorId: string; refreshKey?: number }) {
  const [rows, setRows] = useState<VendorPaymentRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/vendors/${vendorId}/payments`)
      .then((r) => r.json())
      .then((j) => setRows(j.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setIsLoading(false))
  }, [vendorId, refreshKey])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Riwayat Pembayaran Vendor (Event Asli)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat pembayaran vendor</p>
        )}

        {!isLoading && rows.length > 0 && (
          <div className="divide-y rounded-md border">
            {rows.map((row) => (
              <div key={row.id} className="p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    Bayar Vendor · {row.paymentMethod === "TRANSFER" ? "Transfer" : "Tunai"}
                  </p>
                  <CurrencyDisplay amount={Number(row.amount)} className="text-sm font-semibold text-green-600" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(row.paymentDate), "dd MMM yyyy HH:mm", { locale: idLocale })}
                  {row.notes ? ` · ${row.notes}` : ""}
                </p>
                {row.allocations.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Alokasi: {row.allocations.map((a) => `${a.debt.purchase.code} (${Number(a.amount).toLocaleString("id-ID")})`).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

