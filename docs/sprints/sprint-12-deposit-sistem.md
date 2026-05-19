# Sprint 12 — Sistem Deposit (Customer & Vendor)

**Durasi:** Minggu 6  
**Goal:** Deposit dua arah — customer bisa punya saldo deposit dari kelebihan bayar atau DP, vendor bisa menerima DP dari toko. Semua deposit bisa dipakai untuk transaksi berikutnya atau dikembalikan tunai.

**Prasyarat:** Sprint 9–11 selesai.

---

## 12.1 — Deposit Service

- [ ] Buat `src/features/deposits/services/deposit.service.ts`:

  **`getAvailableDeposit(partyType, partyId)`**
  - Sum semua Deposit.balance untuk party ini
  - Return: `{ totalDeposit, deposits[] }`

  **`createDeposit(partyType, partyId, amount, source, sourceId)`**
  - Buat Deposit record
  - Buat LedgerEntry: DEPOSIT_IN CREDIT

  **`useDeposit(depositId, amount, referenceType, referenceId)`**
  - Validasi: amount <= deposit.balance
  - Update Deposit.usedAmount + balance
  - Buat DepositUsage record
  - Buat LedgerEntry: DEPOSIT_OUT DEBIT

  **`returnDeposit(depositId, amount, paymentMethod)`**
  - Validasi: amount <= deposit.balance
  - Update Deposit.returnedAmount + balance
  - Buat DepositUsage record (usageType=RETURN)
  - Buat LedgerEntry: DEPOSIT_RETURN CREDIT

---

## 12.2 — Update POS Checkout Flow

Saat customer overpay di POS, sistem sekarang tanya:

```
Kelebihan bayar: Rp 50.000
[ ] Kembalikan tunai
[ ] Simpan sebagai deposit
```

- [ ] Update `PaymentModal` — tambah pilihan saat `overpayAmount > 0`:
  - Radio: "Kembalikan tunai" (default) atau "Simpan deposit"
  - Jika deposit: tampilkan konfirmasi "Deposit Rp 50.000 akan disimpan untuk transaksi berikutnya"

- [ ] Update `processCheckout()` di `pos.service.ts`:
  - Terima parameter `overpayAction: 'return' | 'deposit'`
  - Jika `deposit`: panggil `createDeposit()` + LedgerEntry DEPOSIT_IN
  - Jika `return`: `changeAmount = overpayAmount` (existing behavior)

- [ ] Saat customer dipilih di POS, tampilkan jika ada deposit:
  - "Deposit tersedia: Rp X.XXX" di CustomerSelect
  - Opsi "Gunakan deposit" di PaymentModal

- [ ] Update `PaymentModal` — jika customer punya deposit:
  - Tampilkan saldo deposit
  - Checkbox "Gunakan deposit (Rp X)" → kurangi nominal yang harus dibayar
  - Kalkulasi: `totalBayar = totalAmount - depositUsed`

---

## 12.3 — Update Purchase Flow untuk Deposit Vendor

- [ ] Update `PurchaseForm` — jika vendor punya deposit:
  - Tampilkan "Vendor punya deposit: Rp X"
  - Opsi "Gunakan deposit vendor" → kurangi hutang ke vendor
  - Jika toko overpay ke vendor → opsi simpan sebagai deposit vendor

---

## 12.4 — Deposit API

- [ ] Buat `src/app/api/deposits/route.ts`:
  - `GET` — list deposit (filter: partyType, partyId, status)

- [ ] Buat `src/app/api/deposits/[id]/use/route.ts`:
  - `POST` — gunakan deposit untuk bayar

- [ ] Buat `src/app/api/deposits/[id]/return/route.ts`:
  - `POST` — kembalikan deposit ke cash

- [ ] Buat `src/app/api/customers/[id]/deposit/route.ts`:
  - `GET` — saldo deposit customer

- [ ] Buat `src/app/api/vendors/[id]/deposit/route.ts`:
  - `GET` — saldo deposit vendor

---

## 12.5 — UI: Manajemen Deposit

- [ ] Buat `src/features/deposits/components/DepositCard.tsx`:
  - Tampilkan saldo deposit, jumlah deposit aktif
  - Tombol "Kembalikan" → form input nominal + metode bayar
  - Riwayat penggunaan deposit

- [ ] Update halaman detail customer — tambah `DepositCard` jika ada deposit
- [ ] Update halaman detail vendor — tambah `DepositCard` jika ada deposit

---

## Checklist Akhir Sprint 12

- [ ] Customer overpay di POS → pilih kembalikan atau deposit
- [ ] Deposit customer bisa dipakai di transaksi berikutnya
- [ ] Deposit customer bisa dikembalikan tunai
- [ ] Vendor bisa menerima DP dari toko
- [ ] Deposit vendor bisa dipakai saat buat PO
- [ ] Saldo deposit tampil di halaman detail customer/vendor
- [ ] LedgerEntry terbuat untuk semua event deposit
