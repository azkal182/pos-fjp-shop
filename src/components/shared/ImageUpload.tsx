"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Upload, X, Loader2, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  value?: string | null          // URL gambar saat ini
  onChange: (url: string | null) => void
  folder?: string                // folder di R2, default "uploads"
  label?: string
  hint?: string
  className?: string
  disabled?: boolean
  maxSizeMB?: number
}

export function ImageUpload({
  value,
  onChange,
  folder = "uploads",
  label = "Upload Gambar",
  hint,
  className,
  disabled = false,
  maxSizeMB = 5,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const displayUrl = localPreview ?? value

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validasi ukuran
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`Ukuran file maksimal ${maxSizeMB} MB`)
      return
    }

    // Preview lokal
    const objectUrl = URL.createObjectURL(file)
    setLocalPreview(objectUrl)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", folder)
      if (value) formData.append("replaceUrl", value)

      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const json = await res.json()

      if (!res.ok || !json.success) {
        alert(json.error ?? "Upload gagal")
        setLocalPreview(null)
        return
      }

      onChange(json.data.url)
    } catch {
      alert("Gagal menghubungi server upload")
      setLocalPreview(null)
    } finally {
      setIsUploading(false)
      URL.revokeObjectURL(objectUrl)
      // Reset input agar bisa upload file yang sama lagi
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function handleRemove() {
    setLocalPreview(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm font-medium">{label}</p>}

      <div className="flex items-start gap-4">
        {/* Preview area */}
        <div
          className={cn(
            "relative flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 overflow-hidden",
            displayUrl ? "border-border" : "border-muted-foreground/30",
            !disabled && "cursor-pointer hover:bg-muted/50 transition-colors"
          )}
          onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : displayUrl ? (
            <Image
              src={displayUrl}
              alt="Preview"
              fill
              className="object-contain p-1"
              unoptimized
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
              <span className="text-[10px]">Klik upload</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
            className="gap-2"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {isUploading ? "Mengupload..." : "Pilih Gambar"}
          </Button>

          {displayUrl && !isUploading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={handleRemove}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
              Hapus
            </Button>
          )}

          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
    </div>
  )
}
