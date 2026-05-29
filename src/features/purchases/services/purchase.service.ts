import { prisma } from "@/lib/prisma"
import { NotFoundError, ValidationError } from "@/lib/exceptions"
import { log } from "@/lib/logger"
import { generateSequentialCode } from "@/lib/code-generator"
import { calculatePagination } from "@/lib/api-response"
import { createMovement } from "@/features/stock-movements/services/stock-movement.service"
import { updateAfterPurchase } from "@/features/products/services/product-vendor-price.service"
import { addEntry } from "@/features/ledger/services/ledger.service"
import { useDepositFifo } from "@/features/deposits/services/deposit.service"
import type { CreatePurchaseInput, PriceChange } from "../schemas/purchase.schema"

function parseLocalDateOnly(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v))
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0)
}

function parseDateFilter(dateStr: string, mode: "start" | "end") {
  // YYYY-MM-DD => local boundary, hindari shift UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map((v) => Number(v))
    return mode === "start"
      ? new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0)
      : new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999)
  }
  return new Date(dateStr)
}

export interface PurchaseFilter {
  vendorId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export async function getAllPurchases(filter: PurchaseFilter = {}) {
  const { vendorId, dateFrom, dateTo, page = 1, limit = 20 } = filter

  const where = {
    ...(vendorId && { vendorId }),
    ...((dateFrom || dateTo) && {
      purchaseDate: {
        ...(dateFrom && { gte: parseDateFilter(dateFrom, "start") }),
        ...(dateTo && { lte: parseDateFilter(dateTo, "end") }),
      },
    }),
  }

  const [data, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
        _count: { select: { items: true } },
        vendorDebt: { select: { id: true, remainingAmount: true, status: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.purchase.count({ where }),
  ])

  return { data, meta: calculatePagination(page, limit, total) }
}

export async function getPurchaseById(id: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      vendor: true,
      user: { select: { id: true, name: true, email: true } },
      vendorDebt: { select: { id: true, remainingAmount: true, status: true } },
      items: {
        include: { product: { select: { id: true, name: true, code: true, unit: true } } },
      },
    },
  })
  if (!purchase) throw new NotFoundError("Pembelian")
  return purchase
}

export async function detectPriceChanges(
  items: { productId: string; buyPrice: number }[]
): Promise<PriceChange[]> {
  const productIds = items.map((i) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, code: true, buyPrice: true },
  })

  return items.map((item) => {
    const product = products.find((p) => p.id === item.productId)
    if (!product) return null
    const previousBuyPrice = Number(product.buyPrice)
    const newBuyPrice = item.buyPrice
    return {
      productId: item.productId,
      productName: product.name,
      productCode: product.code,
      previousBuyPrice,
      newBuyPrice,
      changed: previousBuyPrice !== newBuyPrice,
    }
  }).filter(Boolean) as PriceChange[]
}

export async function createPurchase(data: CreatePurchaseInput, userId: string) {
  // Validasi vendor aktif
  const vendor = await prisma.vendor.findUnique({ where: { id: data.vendorId }, select: { isActive: true, name: true } })
  if (!vendor) throw new NotFoundError("Vendor")
  if (!vendor.isActive) throw new ValidationError("Vendor tidak aktif")

  // Validasi semua produk aktif
  for (const item of data.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { isActive: true, name: true } })
    if (!product) throw new NotFoundError(`Produk tidak ditemukan`)
    if (!product.isActive) throw new ValidationError(`Produk "${product.name}" tidak aktif`)
  }

  const code = await generateSequentialCode("PO")
  const businessDate = parseLocalDateOnly(data.purchaseDate)
  const eventBaseTime = new Date()
  const totalAmount = data.items.reduce(
    (sum, item) => sum + item.quantity * item.buyPrice,
    0
  )

  // Hitung payment amounts
  // paidAmount undefined = tidak bayar sama sekali (semua jadi hutang)
  // paidAmount 0        = sama, tidak bayar
  // paidAmount > 0      = bayar sebagian atau lunas
  const paidAmount = data.paidAmount ?? 0  // undefined → 0 (hutang semua)
  const paymentMethod = data.paymentMethod ?? "CASH"

  // ── DEBUG: kalkulasi payment ──────────────────────────────────────────────
  log.debug("[PURCHASE]", "Payment calculation", {
    code,
    vendor: vendor.name,
    itemCount: data.items.length,
    items: data.items.map((i) => ({
      productId: i.productId,
      qty: i.quantity,
      buyPrice: i.buyPrice,
      subtotal: i.quantity * i.buyPrice,
    })),
    totalAmount,
    paidAmountInput: data.paidAmount,   // nilai asli dari input (bisa undefined)
    paidAmountEffective: paidAmount,    // setelah ?? 0
    paymentMethod,
    case: paidAmount === 0
      ? "HUTANG_SEMUA"
      : paidAmount >= totalAmount
      ? "LUNAS"
      : "PARTIAL",
  })
  // ─────────────────────────────────────────────────────────────────────────

  const purchase = await prisma.$transaction(async (tx) => {
    const depositAgg = await tx.deposit.aggregate({
      where: { partyType: "VENDOR", partyId: data.vendorId, balance: { gt: 0 } },
      _sum: { balance: true },
    })
    const availableDeposit = Number(depositAgg._sum.balance ?? 0)
    const autoDepositUsed = Math.min(totalAmount, availableDeposit)
    const effectivePaid = paidAmount + autoDepositUsed
    const paymentForInvoice = Math.min(totalAmount, effectivePaid)
    // Komponen cash yang benar-benar dipakai untuk melunasi invoice PO.
    // Deposit dicatat terpisah sebagai DEPOSIT_OUT, jadi jangan ikut dihitung lagi di PAYMENT_OUT.
    const cashAppliedToInvoice = Math.max(0, paymentForInvoice - autoDepositUsed)
    const debtAmount = Math.max(0, totalAmount - effectivePaid)
    const overpayAmount = Math.max(0, effectivePaid - totalAmount)
    const paymentStatus = effectivePaid >= totalAmount ? "PAID" : effectivePaid > 0 ? "PARTIAL" : "UNPAID"

    // 1. Buat Purchase dengan payment info
    const purchase = await tx.purchase.create({
      data: {
        code,
        vendorId: data.vendorId,
        userId,
        totalAmount,
        paidAmount,
        changeAmount: overpayAmount,
        debtAmount,
        paymentStatus,
        paymentMethod,
        notes: data.notes,
        receiptImageUrl: data.receiptImageUrl || null,
        purchaseDate: businessDate,
      },
    })

    log.debug("[PURCHASE]", "Purchase record created", { purchaseId: purchase.id, code })

    // 2. Proses setiap item
    for (const item of data.items) {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: item.productId },
        select: { buyPrice: true },
      })
      const previousBuyPrice = Number(product.buyPrice)
      const priceChanged = previousBuyPrice !== item.buyPrice

      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: item.quantity,
          buyPrice: item.buyPrice,
          previousBuyPrice: priceChanged ? previousBuyPrice : null,
          priceChanged,
          subtotal: item.quantity * item.buyPrice,
        },
      })

      await createMovement(tx, {
        productId: item.productId,
        type: "PURCHASE_IN",
        quantity: item.quantity,
        referenceCode: code,
        purchaseId: purchase.id,
      })

      if ((data.confirmedPriceUpdates ?? []).includes(item.productId)) {
        await tx.product.update({
          where: { id: item.productId },
          data: { buyPrice: item.buyPrice },
        })
        log.warn("[PURCHASE]", "Buy price updated", { productId: item.productId, previousBuyPrice, newBuyPrice: item.buyPrice })
      } else if (priceChanged) {
        log.warn("[PURCHASE]", "Price change detected but not confirmed", { productId: item.productId, previousBuyPrice, newBuyPrice: item.buyPrice })
      }
    }

    // 3. LedgerEntry: INVOICE DEBIT (hutang toko ke vendor bertambah)
    const invoiceDate = new Date(eventBaseTime.getTime())
    await addEntry({
      partyType: "VENDOR",
      partyId: data.vendorId,
      type: "INVOICE",
      direction: "DEBIT",
      amount: totalAmount,
      description: `PO ${code}`,
      referenceType: "PURCHASE",
      referenceId: purchase.id,
      createdBy: userId,
      createdAt: invoiceDate,
    }, tx)

    log.debug("[PURCHASE]", "Ledger INVOICE entry created", {
      direction: "DEBIT",
      amount: totalAmount,
      description: `PO ${code}`,
    })

    // 4. LedgerEntry: PAYMENT_OUT CREDIT (toko bayar ke vendor)
    // Beri offset +1ms agar createdAt tidak identik dengan INVOICE entry,
    // sehingga orderBy createdAt deterministik saat query running balance.
    if (cashAppliedToInvoice > 0) {
      const paymentDate = new Date(invoiceDate.getTime() + 1)
      await addEntry({
        partyType: "VENDOR",
        partyId: data.vendorId,
        type: "PAYMENT_OUT",
        direction: "CREDIT",
        amount: cashAppliedToInvoice,
        description: `Bayar PO ${code}`,
        paymentMethod,
        referenceType: "PURCHASE",
        referenceId: purchase.id,
        createdBy: userId,
        createdAt: paymentDate,
      }, tx)

      log.debug("[PURCHASE]", "Ledger PAYMENT_OUT entry created", {
        direction: "CREDIT",
        amount: cashAppliedToInvoice,
        paymentMethod,
      })
    } else {
      log.debug("[PURCHASE]", "No payment — skipping PAYMENT_OUT ledger entry", {
        reason: "tidak ada cash yang dialokasikan ke invoice (dibayar oleh deposit / hutang)",
      })
    }

    if (autoDepositUsed > 0) {
      await useDepositFifo(
        "VENDOR",
        data.vendorId,
        autoDepositUsed,
        "PURCHASE",
        purchase.id,
        userId,
        { writeLedger: false },
        tx
      )
      // Tidak ada entry ledger DEPOSIT_OUT pada flow PO.
      // Konsumsi deposit sudah tercermin di kombinasi INVOICE + PAYMENT_OUT (cash saja).
    }

    // 5. Buat VendorDebt jika ada hutang
    if (debtAmount > 0) {
      await tx.vendorDebt.create({
        data: {
          vendorId: data.vendorId,
          purchaseId: purchase.id,
          originalAmount: debtAmount,
          remainingAmount: debtAmount,
          status: effectivePaid === 0 ? "UNPAID" : "PARTIAL",
          debtDate: businessDate,
        },
      })
      log.debug("[PURCHASE]", "VendorDebt record created", {
        debtAmount,
        status: effectivePaid === 0 ? "UNPAID" : "PARTIAL",
      })
    } else {
      log.debug("[PURCHASE]", "No debt — skipping VendorDebt creation", {
        reason: "debtAmount = 0 (lunas atau overpay)",
      })
    }

    // 6. Jika overpay → otomatis jadi deposit vendor (DEPOSIT_IN CREDIT)
    if (overpayAmount > 0) {
      // +2ms dari invoiceDate agar urutan entry tetap deterministik
      const depositDate = new Date(invoiceDate.getTime() + 3)
      await addEntry({
        partyType: "VENDOR",
        partyId: data.vendorId,
        type: "DEPOSIT_IN",
        direction: "CREDIT",
        amount: overpayAmount,
        description: `Deposit dari kelebihan bayar PO ${code}`,
        referenceType: "PURCHASE",
        referenceId: purchase.id,
        createdBy: userId,
        createdAt: depositDate,
      }, tx)

      // Buat Deposit record untuk vendor
      await tx.deposit.create({
        data: {
          partyType: "VENDOR",
          partyId: data.vendorId,
          amount: overpayAmount,
          balance: overpayAmount,
          source: "OVERPAY_PURCHASE",
          sourceId: purchase.id,
          notes: `Kelebihan bayar PO ${code}`,
        },
      })

      log.debug("[PURCHASE]", "Overpay → vendor deposit created", {
        overpayAmount,
        depositSource: "OVERPAY_PURCHASE",
      })
    }

    return purchase
  })

  // ── INFO: ringkasan akhir ─────────────────────────────────────────────────
  log.info("[PURCHASE]", "Purchase created", {
    code,
    vendor: vendor.name,
    itemCount: data.items.length,
    totalAmount,
    paidAmount: Number(purchase.paidAmount),
    debtAmount: Number(purchase.debtAmount),
    overpayAmount: Number(purchase.changeAmount),
    paymentStatus: purchase.paymentStatus,
  })
  // ─────────────────────────────────────────────────────────────────────────

  // Update ProductVendorPrice catalog setelah PO selesai
  const purchaseDate = businessDate
  for (const item of data.items) {
    await updateAfterPurchase(item.productId, data.vendorId, item.buyPrice, purchaseDate)
  }

  return getPurchaseById(purchase.id)
}
