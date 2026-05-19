import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/exceptions"
import type { CreateVendorInput, UpdateVendorInput } from "../schemas"

export interface VendorFilter {
  search?: string
  isActive?: boolean
}

export async function getAllVendors(filter: VendorFilter = {}) {
  const { search, isActive } = filter
  return prisma.vendor.findMany({
    where: {
      ...(search && { name: { contains: search, mode: "insensitive" } }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { _count: { select: { purchases: true } } },
    orderBy: { name: "asc" },
  })
}

export async function getVendorById(id: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: { _count: { select: { purchases: true } } },
  })
  if (!vendor) throw new NotFoundError("Vendor")
  return vendor
}

export async function createVendor(data: CreateVendorInput) {
  return prisma.vendor.create({ data })
}

export async function updateVendor(id: string, data: UpdateVendorInput) {
  await getVendorById(id)
  return prisma.vendor.update({ where: { id }, data })
}

export async function softDeleteVendor(id: string) {
  await getVendorById(id)
  return prisma.vendor.update({ where: { id }, data: { isActive: false } })
}
