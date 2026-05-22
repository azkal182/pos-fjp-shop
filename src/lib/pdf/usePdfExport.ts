"use client"

import { useState } from "react"
import { pdf } from "@react-pdf/renderer"
import type { ReactElement } from "react"
import type { DocumentProps } from "@react-pdf/renderer"

/**
 * Fetch gambar dari URL dan konversi ke base64 data URI.
 * Diperlukan agar @react-pdf/renderer bisa embed gambar tanpa masalah CORS,
 * karena PDF di-generate di browser dan R2 mungkin tidak set CORS header.
 *
 * Jika fetch gagal (CORS, network error, dll), kembalikan null
 * sehingga PDF tetap bisa di-generate tanpa logo.
 */
export async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { mode: "cors", cache: "force-cache" })
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Hook untuk generate dan download PDF dari React component.
 * Menghindari masalah SSR karena @react-pdf/renderer hanya berjalan di browser.
 */
export function usePdfExport() {
  const [isGenerating, setIsGenerating] = useState(false)

  async function exportPdf(document: ReactElement, filename: string) {
    setIsGenerating(true)
    try {
      const blob = await pdf(document as ReactElement<DocumentProps>).toBlob()
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsGenerating(false)
    }
  }

  return { exportPdf, isGenerating }
}
