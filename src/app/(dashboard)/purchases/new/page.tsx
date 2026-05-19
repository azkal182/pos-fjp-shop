"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { PurchaseForm } from "@/features/purchases/components/PurchaseForm"
import { useToast } from "@/hooks/useToast"

export default function NewPurchasePage() {
  const router = useRouter()
  const toast = useToast()

  async function handleSuccess() {
    toast.success("Pembelian berhasil disimpan. Stok telah diperbarui.")
    router.push("/purchases")
  }

  return (
    <PageWrapper
      title="Pembelian Baru"
      actions={
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      }
    >
      <PurchaseForm onSuccess={handleSuccess} />
    </PageWrapper>
  )
}
