# Sprint Plan — POS FJP Shop

**Stack:** Next.js 16 · Better Auth · Prisma v7 · PostgreSQL · Tailwind CSS · shadcn/ui · Zod · Zustand · React Hook Form  
**Total Durasi:** 9 Minggu (8 Sprint)

---

## Daftar Sprint

| Sprint | File | Scope | Durasi |
|--------|------|-------|--------|
| Sprint 1 | [sprint-1-foundation.md](./sprint-1-foundation.md) | Foundation & Infrastructure | Minggu 1–2 |
| Sprint 2 | [sprint-2-master-data-produk-kategori.md](./sprint-2-master-data-produk-kategori.md) | Master Data: Kategori & Produk | Minggu 3 (bag. 1) |
| Sprint 3 | [sprint-3-master-data-vendor-customer.md](./sprint-3-master-data-vendor-customer.md) | Master Data: Vendor & Customer | Minggu 3 (bag. 2) |
| Sprint 4 | [sprint-4-pembelian-stock-movement.md](./sprint-4-pembelian-stock-movement.md) | Pembelian Barang & Stock Movement | Minggu 4 |
| Sprint 5 | [sprint-5-pos-transaksi.md](./sprint-5-pos-transaksi.md) | POS & Transaksi (Core) | Minggu 5–6 |
| Sprint 6 | [sprint-6-hutang-pembayaran.md](./sprint-6-hutang-pembayaran.md) | Hutang & Pembayaran Hutang | Minggu 7 |
| Sprint 7 | [sprint-7-laporan-dashboard.md](./sprint-7-laporan-dashboard.md) | Laporan & Dashboard | Minggu 8 |
| Sprint 8 | [sprint-8-settings-users-polish.md](./sprint-8-settings-users-polish.md) | Settings, Users & Polish | Minggu 9 |
| Sprint 9 | [sprint-9-schema-keuangan.md](./sprint-9-schema-keuangan.md) | Schema & Migration: Sistem Keuangan Lanjutan | Minggu 10–11 |
| Sprint 10 | [sprint-10-multi-vendor-produk.md](./sprint-10-multi-vendor-produk.md) | Multi-Vendor per Produk & Filter | Minggu 12 |
| Sprint 11 | [sprint-11-pembelian-hutang-vendor.md](./sprint-11-pembelian-hutang-vendor.md) | Pembelian dengan Hutang & Keuangan Vendor | Minggu 13–14 |
| Sprint 12 | [sprint-12-deposit-sistem.md](./sprint-12-deposit-sistem.md) | Sistem Deposit (Customer & Vendor) | Minggu 15 |
| Sprint 13 | [sprint-13-laporan-keuangan-lanjutan.md](./sprint-13-laporan-keuangan-lanjutan.md) | Laporan Keuangan Lanjutan & Export PDF | Minggu 16–17 |

---

## Kondisi Awal Project

- Next.js 16 + Prisma v7 + Better Auth sudah terpasang
- Schema Prisma: hanya tabel auth (user, session, account, verification) — migration sudah jalan
- Schema bisnis belum ada
- Layout masih default Next.js boilerplate
- Belum ada folder `src/features`, `src/lib`, `src/hooks`, `src/stores`, `src/config`

---

## Dependency Antar Sprint

```
Sprint 1 (Foundation)
    └── Sprint 2 (Kategori & Produk)
    └── Sprint 3 (Vendor & Customer)
            └── Sprint 4 (Pembelian & Stock)
                    └── Sprint 5 (POS & Transaksi)  ← bergantung pada Sprint 2, 3, 4
                            └── Sprint 6 (Hutang)   ← bergantung pada Sprint 5
                                    └── Sprint 7 (Laporan & Dashboard)  ← bergantung pada semua
                                            └── Sprint 8 (Polish)       ← bergantung pada semua
                                                    └── Sprint 9 (Schema Keuangan)  ← migration besar
                                                            └── Sprint 10 (Multi-Vendor)
                                                            └── Sprint 11 (Hutang Vendor)
                                                            └── Sprint 12 (Deposit)
                                                                    └── Sprint 13 (Laporan Lanjutan)
```

Sprint 10, 11, 12 bisa dikerjakan paralel setelah Sprint 9 selesai.

---

## Business Rules Kritis (Jangan Sampai Terlewat)

1. **Walk-in customer** — tidak boleh hutang, wajib bayar lunas
2. **FIFO debt allocation** — hutang terlama diselesaikan dulu (customer dan vendor)
3. **Overpay di POS** — user pilih: kembalikan tunai atau simpan deposit
4. **Deposit** — balance negatif di LedgerAccount = toko hutang ke party
5. **Stok** — hanya bisa berubah via purchase atau stock adjustment, tidak bisa diedit manual di form produk
6. **Soft delete customer** — ditolak jika masih ada hutang aktif
7. **Price change detection** — saat pembelian, sistem deteksi perubahan harga beli dan minta konfirmasi admin
8. **HPP snapshot** — `TransactionItem.buyPrice` adalah snapshot HPP saat transaksi, bukan harga beli terkini
9. **LedgerEntry immutable** — entry yang sudah dibuat tidak boleh diedit/hapus, hanya bisa di-reverse dengan entry baru (ADJUSTMENT)
10. **Deposit tidak bisa melebihi saldo** — validasi ketat saat gunakan deposit
