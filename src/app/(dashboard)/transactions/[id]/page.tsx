"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Printer, FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { TransactionDetail } from "@/features/transactions/components/TransactionDetail"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { usePdfExport } from "@/lib/pdf/usePdfExport"
import { TransactionPdf } from "@/features/transactions/pdf/TransactionPdf"
import { useSettingsStore } from "@/stores/settings.store"

export default function TransactionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [transaction, setTransaction] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { exportPdf, isGenerating } = usePdfExport()
  const { store, load } = useSettingsStore()

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch(`/api/transactions/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((json) => setTransaction(json.data))
      .catch(() => router.push("/transactions"))
      .finally(() => setIsLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <LoadingSpinner centered />
  if (!transaction) return null

  const isConfirmed = transaction.confirmationStatus === "CONFIRMED"

  function handlePrintReceipt() {
    // Buka halaman print di tab baru — bersih tanpa dashboard
    window.open(`/print/receipt/${id}`, "_blank", "noopener,noreferrer")
  }

  async function handleExportPdf() {
    await exportPdf(
      <TransactionPdf
        transaction={transaction}
        storeName={store.storeName || "FJP Shop"}
        storeAddress={store.storeAddress}
        storePhone={store.storePhone}
        storeReceiptNote={store.receiptNote}
      />,
      `invoice-${transaction.code}.pdf`
    )
  }

  return (
    <PageWrapper
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          {isConfirmed && (
            <>
              <Button variant="outline" onClick={handlePrintReceipt}>
                <Printer className="h-4 w-4 mr-2" />
                Print Nota
              </Button>
              <Button variant="outline" onClick={handleExportPdf} disabled={isGenerating} className="gap-2">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Export PDF
              </Button>
            </>
          )}
        </div>
      }
    >
      <TransactionDetail transaction={transaction} />
    </PageWrapper>
  )
}
