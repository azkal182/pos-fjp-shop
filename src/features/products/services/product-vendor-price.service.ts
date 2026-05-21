import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/exceptions"

export async function getVendorPricesForProduct(productId: string) {
  return prisma.productVendorPrice.findMany({
    where: { productId },
    include: { vendor: { select: { id: true, name: true, phone: true, isActive: true } } },
    orderBy: [{ isPreferred: "desc" }, { lastOrderAt: "desc" }],
  })
}

export async function getProductsForVendor(vendorId: string) {
  const prices = await prisma.productVendorPrice.findMany({
    where: { vendorId },
    include: {
      product: {
        include: { category: { select: { name: true } } },
      },
    },
    orderBy: { lastOrderAt: "desc" },
  })
  return prices.map((p) => ({ ...p.product, vendorBuyPrice: Number(p.buyPrice), isPreferred: p.isPreferred, lastOrderAt: p.lastOrderAt }))
}

export async function getVendorPriceForProductAndVendor(productId: string, vendorId: string) {
  return prisma.productVendorPrice.findUnique({
    where: { productId_vendorId: { productId, vendorId } },
  })
}

export async function upsertVendorPrice(
  productId: string,
  vendorId: string,
  buyPrice: number,
  isPreferred?: boolean,
  notes?: string
) {
  // Validasi produk dan vendor ada
  const [product, vendor] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId }, select: { id: true } }),
    prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } }),
  ])
  if (!product) throw new NotFoundError("Produk")
  if (!vendor) throw new NotFoundError("Vendor")

  return prisma.productVendorPrice.upsert({
    where: { productId_vendorId: { productId, vendorId } },
    update: { buyPrice, ...(isPreferred !== undefined && { isPreferred }), ...(notes !== undefined && { notes }) },
    create: { productId, vendorId, buyPrice, isPreferred: isPreferred ?? false, notes },
    include: { vendor: { select: { id: true, name: true } } },
  })
}

export async function setPreferredVendor(productId: string, vendorId: string) {
  // Unset semua preferred untuk produk ini, lalu set yang baru
  await prisma.$transaction([
    prisma.productVendorPrice.updateMany({
      where: { productId },
      data: { isPreferred: false },
    }),
    prisma.productVendorPrice.update({
      where: { productId_vendorId: { productId, vendorId } },
      data: { isPreferred: true },
    }),
  ])
}

export async function deleteVendorPrice(productId: string, vendorId: string) {
  const existing = await prisma.productVendorPrice.findUnique({
    where: { productId_vendorId: { productId, vendorId } },
  })
  if (!existing) throw new NotFoundError("Relasi produk-vendor")
  return prisma.productVendorPrice.delete({
    where: { productId_vendorId: { productId, vendorId } },
  })
}

/** Dipanggil setelah PO selesai — update harga dan lastOrderAt */
export async function updateAfterPurchase(
  productId: string,
  vendorId: string,
  buyPrice: number,
  purchaseDate: Date
) {
  await prisma.productVendorPrice.upsert({
    where: { productId_vendorId: { productId, vendorId } },
    update: { buyPrice, lastOrderAt: purchaseDate },
    create: { productId, vendorId, buyPrice, lastOrderAt: purchaseDate, isPreferred: false },
  })
}
