"use client"

import { useState } from "react"
import { pdf } from "@react-pdf/renderer"
import type { ReactElement } from "react"
import type { DocumentProps } from "@react-pdf/renderer"

/**
 * Fetch gambar dari URL via server proxy dan konversi ke base64 data URI.
 * Menggunakan /api/image-proxy agar tidak kena CORS — server fetch langsung ke R2.
 *
 * Jika gagal, kembalikan null sehingga PDF tetap bisa di-generate tanpa logo.
 */
export async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null
  try {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`
    const res = await fetch(proxyUrl)
    if (!res.ok) return null
    const json = await res.json()
    return json.data?.dataUri ?? null
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
