"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { TransactionDetail } from "@/features/transactions/components/TransactionDetail"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { ReceiptDialog } from "@/features/pos/components/ReceiptDialog"

export default function TransactionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [transaction, setTransaction] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showReceipt, setShowReceipt] = useState(false)

  useEffect(() => {
    fetch(`/api/transactions/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((json) => setTransaction(json.data))
      .catch(() => router.push("/transactions"))
      .finally(() => setIsLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <LoadingSpinner centered />
  if (!transaction) return null

  // Hanya tampilkan tombol print untuk transaksi CONFIRMED
  const isConfirmed = transaction.confirmationStatus === "CONFIRMED"

  return (
    <PageWrapper
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          {isConfirmed && (
            <Button variant="outline" onClick={() => setShowReceipt(true)}>
              <Printer className="h-4 w-4 mr-2" />
              Print Nota
            </Button>
          )}
        </div>
      }
    >
      <TransactionDetail transaction={transaction} />

      <ReceiptDialog
        open={showReceipt}
        onOpenChange={setShowReceipt}
        transaction={isConfirmed ? transaction : null}
      />
    </PageWrapper>
  )
}
