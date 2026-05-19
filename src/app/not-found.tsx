import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <FileQuestion className="h-16 w-16 text-muted-foreground/30 mx-auto" />
        <div>
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-muted-foreground mt-2">Halaman tidak ditemukan</p>
        </div>
        <Button asChild>
          <Link href="/">Kembali ke Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
