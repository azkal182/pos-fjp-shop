import { Suspense } from "react"
import { NewPurchaseClient } from "./NewPurchaseClient"

export default function NewPurchasePage() {
  return (
    <Suspense fallback={null}>
      <NewPurchaseClient />
    </Suspense>
  )
}
