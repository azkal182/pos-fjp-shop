"use client"

import { useState } from "react"
import { toast } from "sonner"

interface UploadResult {
  url: string
  key: string
}

interface UseImageUploadOptions {
  folder?: string
  onSuccess?: (result: UploadResult) => void
  onError?: (error: string) => void
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const { folder = "uploads", onSuccess, onError } = options
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  async function upload(file: File, replaceUrl?: string): Promise<UploadResult | null> {
    setIsUploading(true)

    // Tampilkan preview lokal segera
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", folder)
      if (replaceUrl) formData.append("replaceUrl", replaceUrl)

      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const json = await res.json()

      if (!res.ok || !json.success) {
        const msg = json.error ?? "Upload gagal"
        toast.error(msg)
        onError?.(msg)
        setPreview(null)
        return null
      }

      onSuccess?.(json.data)
      return json.data as UploadResult
    } catch (err) {
      const msg = "Gagal menghubungi server upload"
      toast.error(msg)
      onError?.(msg)
      setPreview(null)
      return null
    } finally {
      setIsUploading(false)
      URL.revokeObjectURL(objectUrl)
    }
  }

  function clearPreview() {
    setPreview(null)
  }

  return { upload, isUploading, preview, clearPreview }
}
