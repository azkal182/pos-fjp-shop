import type { Metadata } from "next"
import { PageWrapper } from "@/components/layout/PageWrapper"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StoreSettings } from "@/features/settings/components/StoreSettings"
import { PosSettings } from "@/features/settings/components/PosSettings"
import { AgingSettings } from "@/features/settings/components/AgingSettings"

export const metadata: Metadata = { title: "Pengaturan" }

export default function SettingsPage() {
  return (
    <PageWrapper title="Pengaturan">
      <Tabs defaultValue="store" className="space-y-6">
        <TabsList>
          <TabsTrigger value="store">Toko</TabsTrigger>
          <TabsTrigger value="pos">POS</TabsTrigger>
          <TabsTrigger value="aging">Aging Hutang</TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <div className="space-y-1 mb-5">
            <h3 className="text-base font-semibold">Informasi Toko</h3>
            <p className="text-sm text-muted-foreground">Nama toko dan informasi kontak yang tampil di struk</p>
          </div>
          <StoreSettings />
        </TabsContent>

        <TabsContent value="pos">
          <div className="space-y-1 mb-5">
            <h3 className="text-base font-semibold">Pengaturan Kasir</h3>
            <p className="text-sm text-muted-foreground">Konfigurasi tampilan dan perilaku modul kasir</p>
          </div>
          <PosSettings />
        </TabsContent>

        <TabsContent value="aging">
          <div className="space-y-1 mb-5">
            <h3 className="text-base font-semibold">Kategori Aging Hutang</h3>
            <p className="text-sm text-muted-foreground">Konfigurasi klasifikasi hutang berdasarkan umur</p>
          </div>
          <AgingSettings />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  )
}
