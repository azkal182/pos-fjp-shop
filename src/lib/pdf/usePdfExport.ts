"use client"

import { useState } from "react"
import { pdf } from "@react-pdf/renderer"
import type { ReactElement } from "react"
import type { DocumentProps } from "@react-pdf/renderer"

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
