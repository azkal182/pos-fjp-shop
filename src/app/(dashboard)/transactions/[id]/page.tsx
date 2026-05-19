"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { TransactionDetail } from "@/features/transactions/components/TransactionDetail"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"

export default function TransactionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [transaction, setTransaction] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/transactions/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((json) => setTransaction(json.data))
      .catch(() => router.push("/transactions"))
      .finally(() => setIsLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <LoadingSpinner centered />
  if (!transaction) return null

  return (
    <PageWrapper
      actions={
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      }
    >
      <TransactionDetail transaction={transaction} />
    </PageWrapper>
  )
}
