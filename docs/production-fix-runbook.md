# Production Correction Runbook

Dokumen ini untuk koreksi data production setelah perbaikan logic ledger/deposit.

## Scope
- Perbaikan schema polymorphic deposit (hapus FK `deposit_vendor_fk`).
- Koreksi data historis ledger `DEPOSIT_RETURN` yang sebelumnya salah arah.
- Recalculate `runningBalance` ledger agar konsisten.
- Rekonsiliasi hasil sebelum/sesudah.

## Prasyarat
- Pastikan `DATABASE_URL` menunjuk database production yang benar.
- Siapkan maintenance window (freeze transaksi sementara).
- Ambil full backup database.

## Langkah Eksekusi
1. Freeze transaksi
- Aktifkan mode maintenance / batasi akses tulis.

2. Backup
- Buat backup DB penuh.
- Simpan snapshot laporan sebelum koreksi.

3. Audit awal (dry-run)
```bash
npm run prod:fix:audit
npm run prod:fix:audit:stock
npm run prod:fix:audit:finance-deep
```
- Tidak mengubah data.
- Catat hasil untuk baseline.

4. Terapkan migration schema
```bash
pnpm prisma:migrate
```
- Migration terkait: `prisma/migrations/20260526184000_drop_deposit_vendor_fk/migration.sql`

5. Apply koreksi data
```bash
npm run prod:fix:apply
```
- Menghapus FK `deposit_vendor_fk` (idempotent).
- Mengubah `ledger_entries` `DEPOSIT_RETURN` dari `CREDIT` ke `DEBIT`.
- Recalculate `runningBalance` semua account.

6. Rekonsiliasi akhir
```bash
npm run prod:fix:reconcile
```
- Bandingkan dengan baseline (langkah 3).
- Validasi angka bisnis inti (total transaksi, hutang customer, hutang vendor).

7. Smoke test API
```bash
npm run test:e2e:full
```
- Jalankan di clone/staging dulu sebelum di production.
- Di production cukup jalankan subset endpoint aman bila diperlukan.

8. Buka akses transaksi
- Jika semua valid, nonaktifkan maintenance mode.

## Opsi Koreksi Stok (Jika Audit Stok Mismatch)
1. Dry-run dulu:
```bash
npm run prod:fix:apply:stock:dry
```
2. Jika hasil sesuai, apply:
```bash
npm run prod:fix:apply:stock
```
3. Verifikasi ulang:
```bash
npm run prod:fix:audit:stock
```

## Rollback Plan
- Jika hasil rekonsiliasi tidak valid: stop, tetap freeze, restore dari backup.
- Investigasi output `prod:fix:audit` + `prod:fix:reconcile` untuk anomali.

## Catatan
- `POST /api/auth/sign-out` butuh header `Origin`, jika tidak akan `403` (expected CSRF protection).
- Script apply bersifat aman untuk rerun (idempotent by query condition).
