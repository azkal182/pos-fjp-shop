import { prisma } from "@/lib/prisma"
import { NotFoundError, ValidationError } from "@/lib/exceptions"
import { log } from "@/lib/logger"
import { generateCode } from "@/lib/utils"
import { calculatePagination } from "@/lib/api-response"
import { createMovement } from "@/features/stock-movements/services/stock-movement.service"
import { updateAfterPurchase } from "@/features/products/services/product-vendor-price.service"
import { addEntry } from "@/features/ledger/services/ledger.service"
import { createDeposit } from "@/features/deposits/services/deposit.service"
import type { CreatePurchaseInput, PriceChange } from "../schemas/purchase.schema"

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
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
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
      orderBy: { purchaseDate: "desc" },
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

  const code = generateCode("PO")
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
  const debtAmount = Math.max(0, totalAmount - paidAmount)
  const overpayAmount = Math.max(0, paidAmount - totalAmount)
  const paymentStatus = paidAmount >= totalAmount ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID"

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
    debtAmount,
    overpayAmount,
    paymentStatus,
    paymentMethod,
    case: paidAmount === 0
      ? "HUTANG_SEMUA"
      : paidAmount >= totalAmount && overpayAmount === 0
      ? "LUNAS"
      : paidAmount > totalAmount
      ? "OVERPAY"
      : "PARTIAL",
  })
  // ─────────────────────────────────────────────────────────────────────────

  const purchase = await prisma.$transaction(async (tx) => {
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
        purchaseDate: new Date(data.purchaseDate),
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
    const invoiceDate = new Date(data.purchaseDate)
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
    if (paidAmount > 0) {
      const paymentDate = new Date(invoiceDate.getTime() + 1)
      await addEntry({
        partyType: "VENDOR",
        partyId: data.vendorId,
        type: "PAYMENT_OUT",
        direction: "CREDIT",
        amount: paidAmount,
        description: `Bayar PO ${code}`,
        paymentMethod,
        referenceType: "PURCHASE",
        referenceId: purchase.id,
        createdBy: userId,
        createdAt: paymentDate,
      }, tx)

      log.debug("[PURCHASE]", "Ledger PAYMENT_OUT entry created", {
        direction: "CREDIT",
        amount: paidAmount,
        paymentMethod,
      })
    } else {
      log.debug("[PURCHASE]", "No payment — skipping PAYMENT_OUT ledger entry", {
        reason: "paidAmount = 0 (hutang semua)",
      })
    }

    // 5. Buat VendorDebt jika ada hutang
    if (debtAmount > 0) {
      await tx.vendorDebt.create({
        data: {
          vendorId: data.vendorId,
          purchaseId: purchase.id,
          originalAmount: debtAmount,
          remainingAmount: debtAmount,
          status: paidAmount === 0 ? "UNPAID" : "PARTIAL",
          debtDate: new Date(data.purchaseDate),
        },
      })
      log.debug("[PURCHASE]", "VendorDebt record created", {
        debtAmount,
        status: paidAmount === 0 ? "UNPAID" : "PARTIAL",
      })
    } else {
      log.debug("[PURCHASE]", "No debt — skipping VendorDebt creation", {
        reason: "debtAmount = 0 (lunas atau overpay)",
      })
    }

    // 6. Jika overpay → otomatis jadi deposit vendor (DEPOSIT_IN CREDIT)
    if (overpayAmount > 0) {
      // +2ms dari invoiceDate agar urutan entry tetap deterministik
      const depositDate = new Date(invoiceDate.getTime() + 2)
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
    paidAmount,
    debtAmount,
    overpayAmount,
    paymentStatus,
  })
  // ─────────────────────────────────────────────────────────────────────────

  // Update ProductVendorPrice catalog setelah PO selesai
  const purchaseDate = new Date(data.purchaseDate)
  for (const item of data.items) {
    await updateAfterPurchase(item.productId, data.vendorId, item.buyPrice, purchaseDate)
  }

  return getPurchaseById(purchase.id)
}
