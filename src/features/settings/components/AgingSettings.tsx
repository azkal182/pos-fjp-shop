import { AgingCategoryManager } from "@/features/debts/components/AgingCategoryManager"

export function AgingSettings() {
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted/50 border px-4 py-3 text-sm text-muted-foreground">
        Kategori aging digunakan untuk mengklasifikasikan hutang berdasarkan umur (jumlah hari sejak hutang terbentuk).
        Setiap hutang akan otomatis dikategorikan dan ditampilkan dengan warna yang sesuai.
      </div>
      <AgingCategoryManager />
    </div>
  )
}
