"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, CheckCircle2, X, Eye, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { useToast } from "@/hooks/useToast"
import { formatDistanceToNow } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import type { PaginationMeta } from "@/types"
import { Pagination } from "@/components/shared/Pagination"

interface DraftTransaction {
  id: string
  code: string
  totalAmount: number
  discountAmount: number
  transactionDate: string
  customer: { id: string; name: string } | null
  _count?: { items: number }
}

export default function PendingTransactionsPage() {
  const router = useRouter()
  const toast = useToast()
  const [drafts, setDrafts] = useState<DraftTransaction[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [cancelTarget, setCancelTarget] = useState<DraftTransaction | null>(null)

  const fetchDrafts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("confirmationStatus", "DRAFT")
      params.set("page", String(page))
      const res = await fetch(`/api/transactions?${params}`)
      const json = await res.json()
      setDrafts(json.data ?? [])
      setMeta(json.meta)
    } catch {
      toast.error("Gagal memuat order pending")
    } finally {
      setIsLoading(false)
    }
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDrafts() }, [fetchDrafts])

  async function handleCancel(draft: DraftTransaction) {
    try {
      const res = await fetch(`/api/transactions/${draft.id}/cancel`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Gagal membatalkan")
      toast.success(`Order ${draft.code} dibatalkan`)
      setCancelTarget(null)
      fetchDrafts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    }
  }

  return (
    <PageWrapper title="Order Pending">
      {/* Summary */}
      <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
          <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">
            {isLoading ? "..." : meta.total} order menunggu konfirmasi
          </p>
          <p className="text-xs text-muted-foreground">
            Konfirmasi order untuk mencatat stok, pembayaran, dan hutang
          </p>
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">Daftar Order Pending</h3>
        </div>

        {isLoading ? (
          <div className="divide-y">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-4 flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : drafts.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Tidak ada order pending</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Semua order sudah dikonfirmasi</p>
          </div>
        ) : (
          <div className="divide-y">
            {drafts.map((draft) => (
              <div key={draft.id} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{draft.code}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold">
                      <Clock className="h-3 w-3" />
                      Pending
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {draft.customer?.name ?? "Walk-in"}
                    {" · "}
                    {formatDistanceToNow(new Date(draft.transactionDate), { addSuffix: true, locale: idLocale })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <CurrencyDisplay amount={Number(draft.totalAmount)} className="text-sm font-semibold" />
                  <p className="text-xs text-muted-foreground">belum termasuk packing</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => router.push(`/transactions/${draft.id}`)}
                    title="Lihat detail"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => router.push(`/transactions/${draft.id}/confirm`)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Konfirmasi
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setCancelTarget(draft)}
                    title="Batalkan order"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination meta={meta} onPageChange={setPage} />

      <ConfirmDialog
        open={!!cancelTarget}
        onConfirm={() => cancelTarget && handleCancel(cancelTarget)}
        onCancel={() => setCancelTarget(null)}
        title="Batalkan Order"
        description={`Order ${cancelTarget?.code} akan dibatalkan dan stok yang di-reserve akan dilepas. Lanjutkan?`}
        confirmLabel="Ya, Batalkan"
      />
    </PageWrapper>
  )
}
