/**
 * Backfill script untuk Sprint 9
 * Jalankan sekali setelah migration: bun run backfill:sprint9
 *
 * Yang dilakukan:
 * 1. Buat LedgerAccount untuk semua customer dan vendor
 * 2. Backfill LedgerEntry dari Transaction + Debt + CustomerPayment existing
 * 3. Backfill ProductVendorPrice dari PurchaseItem existing
 * 4. Update Purchase existing: set paymentStatus=PAID, paidAmount=totalAmount
 */

import "dotenv/config"
import { prisma } from "../src/lib/prisma"

async function main() {
  console.log("🔄 Backfill Sprint 9 — Financial System...")

  // ── 1. LedgerAccount untuk semua Customer ────────────────────────────────────
  const customers = await prisma.customer.findMany({ select: { id: true, name: true } })
  let customerAccountsCreated = 0
  for (const c of customers) {
    await prisma.ledgerAccount.upsert({
      where: { partyType_partyId: { partyType: "CUSTOMER", partyId: c.id } },
      update: {},
      create: { partyType: "CUSTOMER", partyId: c.id },
    })
    customerAccountsCreated++
  }
  console.log(`✅ ${customerAccountsCreated} LedgerAccount untuk customer`)

  // ── 2. LedgerAccount untuk semua Vendor ──────────────────────────────────────
  const vendors = await prisma.vendor.findMany({ select: { id: true, name: true } })
  let vendorAccountsCreated = 0
  for (const v of vendors) {
    await prisma.ledgerAccount.upsert({
      where: { partyType_partyId: { partyType: "VENDOR", partyId: v.id } },
      update: {},
      create: { partyType: "VENDOR", partyId: v.id },
    })
    vendorAccountsCreated++
  }
  console.log(`✅ ${vendorAccountsCreated} LedgerAccount untuk vendor`)

  // ── 3. Backfill LedgerEntry dari Transaction existing ────────────────────────
  const adminUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } })
  const adminId = adminUser?.id ?? "system"

  const existingLedgerEntries = await prisma.ledgerEntry.count()
  if (existingLedgerEntries > 0) {
    console.log(`⏭️  LedgerEntry sudah ada (${existingLedgerEntries}), skip backfill transaksi`)
  } else {
    // Ambil semua transaksi customer (bukan walk-in), urut dari terlama
    const transactions = await prisma.transaction.findMany({
      where: { customerId: { not: null } },
      include: { debt: true },
      orderBy: { transactionDate: "asc" },
    })

    // Track running balance per customer
    const balances: Record<string, number> = {}

    for (const trx of transactions) {
      if (!trx.customerId) continue

      const account = await prisma.ledgerAccount.findUnique({
        where: { partyType_partyId: { partyType: "CUSTOMER", partyId: trx.customerId } },
      })
      if (!account) continue

      const currentBalance = balances[trx.customerId] ?? 0

      // Entry 1: INVOICE (debit — hutang bertambah)
      const balanceAfterInvoice = currentBalance + Number(trx.totalAmount)
      await prisma.ledgerEntry.create({
        data: {
          accountId: account.id,
          type: "INVOICE",
          direction: "DEBIT",
          amount: Number(trx.totalAmount),
          runningBalance: balanceAfterInvoice,
          description: `Penjualan ${trx.code}`,
          referenceType: "TRANSACTION",
          referenceId: trx.id,
          createdAt: trx.transactionDate,
          createdBy: adminId,
        },
      })

      // Entry 2: PAYMENT_IN (credit — bayar)
      let balanceAfterPayment = balanceAfterInvoice
      if (Number(trx.paidAmount) > 0) {
        balanceAfterPayment = balanceAfterInvoice - Number(trx.paidAmount)
        await prisma.ledgerEntry.create({
          data: {
            accountId: account.id,
            type: "PAYMENT_IN",
            direction: "CREDIT",
            amount: Number(trx.paidAmount),
            runningBalance: balanceAfterPayment,
            description: `Pembayaran ${trx.code}`,
            paymentMethod: trx.paymentMethod,
            referenceType: "TRANSACTION",
            referenceId: trx.id,
            createdAt: trx.transactionDate,
            createdBy: adminId,
          },
        })
      }

      balances[trx.customerId] = balanceAfterPayment
    }

    // Backfill CustomerPayment (pembayaran hutang manual)
    const customerPayments = await prisma.customerPayment.findMany({
      orderBy: { paymentDate: "asc" },
    })

    for (const cp of customerPayments) {
      const account = await prisma.ledgerAccount.findUnique({
        where: { partyType_partyId: { partyType: "CUSTOMER", partyId: cp.customerId } },
      })
      if (!account) continue

      const currentBalance = balances[cp.customerId] ?? 0
      const balanceAfter = currentBalance - Number(cp.amount)

      await prisma.ledgerEntry.create({
        data: {
          accountId: account.id,
          type: "PAYMENT_IN",
          direction: "CREDIT",
          amount: Number(cp.amount),
          runningBalance: balanceAfter,
          description: cp.source === "POS_OVERPAYMENT" ? "Overpay POS" : "Bayar hutang langsung",
          referenceType: "CUSTOMER_PAYMENT",
          referenceId: cp.id,
          notes: cp.notes,
          createdAt: cp.paymentDate,
          createdBy: adminId,
        },
      })

      balances[cp.customerId] = balanceAfter
    }

    const totalEntries = await prisma.ledgerEntry.count()
    console.log(`✅ ${totalEntries} LedgerEntry dari transaksi existing`)
  }

  // ── 4. Backfill ProductVendorPrice dari PurchaseItem ─────────────────────────
  const existingPVP = await prisma.productVendorPrice.count()
  if (existingPVP > 0) {
    console.log(`⏭️  ProductVendorPrice sudah ada (${existingPVP}), skip backfill`)
  } else {
    // Ambil harga terakhir per produk-vendor dari PurchaseItem
    const purchaseItems = await prisma.purchaseItem.findMany({
      include: {
        purchase: { select: { vendorId: true, purchaseDate: true } },
        product: { select: { id: true } },
      },
      orderBy: { createdAt: "asc" }, // urut dari terlama agar yang terbaru overwrite
    })

    // Map: productId-vendorId → { buyPrice, lastOrderAt }
    const priceMap = new Map<string, { buyPrice: number; lastOrderAt: Date; vendorId: string; productId: string }>()
    for (const item of purchaseItems) {
      const key = `${item.productId}-${item.purchase.vendorId}`
      priceMap.set(key, {
        buyPrice: Number(item.buyPrice),
        lastOrderAt: item.purchase.purchaseDate,
        vendorId: item.purchase.vendorId,
        productId: item.productId,
      })
    }

    let pvpCreated = 0
    for (const [, data] of priceMap) {
      await prisma.productVendorPrice.upsert({
        where: { productId_vendorId: { productId: data.productId, vendorId: data.vendorId } },
        update: { buyPrice: data.buyPrice, lastOrderAt: data.lastOrderAt },
        create: {
          productId: data.productId,
          vendorId: data.vendorId,
          buyPrice: data.buyPrice,
          lastOrderAt: data.lastOrderAt,
          isPreferred: false,
        },
      })
      pvpCreated++
    }

    // Set isPreferred = true untuk vendor yang paling sering supply produk
    const products = await prisma.product.findMany({ select: { id: true } })
    for (const product of products) {
      const prices = await prisma.productVendorPrice.findMany({
        where: { productId: product.id },
        orderBy: { lastOrderAt: "desc" },
      })
      if (prices.length > 0 && !prices.some((p) => p.isPreferred)) {
        // Set vendor dengan order terbaru sebagai preferred
        await prisma.productVendorPrice.update({
          where: { id: prices[0].id },
          data: { isPreferred: true },
        })
      }
    }

    console.log(`✅ ${pvpCreated} ProductVendorPrice dari riwayat pembelian`)
  }

  // ── 5. Update Purchase existing: set paymentStatus=PAID ──────────────────────
  const purchasesWithoutStatus = await prisma.purchase.count({
    where: { paymentStatus: "UNPAID" },
  })
  if (purchasesWithoutStatus > 0) {
    await prisma.purchase.updateMany({
      where: { paymentStatus: "UNPAID" },
      data: {
        paymentStatus: "PAID",
        // paidAmount sudah 0 dari default, update ke totalAmount
      },
    })
    // Update paidAmount = totalAmount untuk semua purchase lama
    const oldPurchases = await prisma.purchase.findMany({
      where: { paidAmount: 0 },
      select: { id: true, totalAmount: true },
    })
    for (const p of oldPurchases) {
      await prisma.purchase.update({
        where: { id: p.id },
        data: { paidAmount: p.totalAmount, paymentStatus: "PAID" },
      })
    }
    console.log(`✅ ${purchasesWithoutStatus} Purchase lama diupdate ke PAID`)
  } else {
    console.log("⏭️  Purchase status sudah up-to-date")
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  const [accounts, entries, pvp] = await Promise.all([
    prisma.ledgerAccount.count(),
    prisma.ledgerEntry.count(),
    prisma.productVendorPrice.count(),
  ])

  console.log("\n🎉 Backfill Sprint 9 selesai!")
  console.log(`   📒 ${accounts} LedgerAccount`)
  console.log(`   📝 ${entries} LedgerEntry`)
  console.log(`   💰 ${pvp} ProductVendorPrice`)
}

main()
  .catch((e) => {
    console.error("❌ Backfill failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
