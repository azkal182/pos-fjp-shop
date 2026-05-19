# POS FJP Shop

Sistem Point of Sale berbasis web untuk toko retail. Dibangun dengan Next.js 16, Prisma v7, Better Auth, dan PostgreSQL.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL + Prisma v7
- **Auth:** Better Auth
- **UI:** Tailwind CSS + shadcn/ui
- **State:** Zustand
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts

## Fitur

- Kasir (POS) dengan cart, diskon, dan receipt
- Manajemen produk, kategori, vendor, customer
- Pembelian barang masuk dengan deteksi perubahan harga
- Manajemen hutang dengan alokasi FIFO dan buku hutang per customer
- Laporan: penjualan, produk terlaris, hutang aging, profit
- Dashboard real-time
- Pengaturan toko, POS, dan kategori aging hutang

## Setup

### 1. Clone & Install

```bash
git clone <repo>
cd pos-fjp-shop
bun install
```

### 2. Environment

```bash
cp .env.example .env
# Edit .env sesuai konfigurasi database dan secret Anda
```

### 3. Database

```bash
# Jalankan migrations
bun --bun run prisma migrate deploy

# Generate Prisma client
bun --bun run prisma generate

# Seed data awal (settings + aging categories + admin user)
bun run seed
```

Default admin credentials setelah seed:
- Email: `admin@fjpshop.com`
- Password: `admin123456`

### 4. Jalankan

```bash
bun run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Scripts

| Script | Deskripsi |
|--------|-----------|
| `bun run dev` | Development server |
| `bun run build` | Production build |
| `bun run start` | Production server |
| `bun run seed` | Seed database |
| `bun --bun run prisma migrate dev` | Buat migration baru |
| `bun --bun run prisma studio` | Prisma Studio (GUI database) |
