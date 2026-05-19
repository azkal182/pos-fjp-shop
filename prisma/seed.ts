
import "dotenv/config"
import { auth } from "../src/lib/auth"
import { prisma } from "../src/lib/prisma"
import { subDays, subHours, subMinutes } from "date-fns"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(prefix: string): string {
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, "")
    const random = Math.floor(1000 + Math.random() * 9000).toString()
    return `${prefix}-${date}-${random}`
}

async function createMovementInTx(
    tx: any,
    data: { productId: string; type: string; quantity: number; referenceCode?: string; purchaseId?: string; transactionId?: string }
) {
    const product = await tx.product.findUniqueOrThrow({ where: { id: data.productId } })
    const stockBefore = product.stock
    const stockAfter = stockBefore + data.quantity
    await tx.stockMovement.create({
        data: {
            productId: data.productId,
            type: data.type,
            quantity: data.quantity,
            stockBefore,
            stockAfter,
            referenceCode: data.referenceCode,
            purchaseId: data.purchaseId,
            transactionId: data.transactionId,
        },
    })
    await tx.product.update({ where: { id: data.productId }, data: { stock: stockAfter } })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log("🌱 Seeding database (full demo data)...")

    // ── 0. Reset data bisnis (bukan auth) ────────────────────────────────────────
    console.log("🧹 Cleaning existing business data...")
    await prisma.customerPayment.deleteMany()
    await prisma.debtPayment.deleteMany()
    await prisma.debt.deleteMany()
    await prisma.stockMovement.deleteMany()
    await prisma.transactionItem.deleteMany()
    await prisma.transaction.deleteMany()
    await prisma.purchaseItem.deleteMany()
    await prisma.purchase.deleteMany()
    await prisma.product.deleteMany()
    await prisma.category.deleteMany()
    await prisma.vendor.deleteMany()
    await prisma.customer.deleteMany()
    console.log("✅ Cleaned")

    // ── 1. Settings ──────────────────────────────────────────────────────────────
    const settings = [
        { key: "store_name", value: "FJP Shop", group: "STORE" as const, label: "Nama Toko" },
        { key: "store_address", value: "Jl. Raya Utama No. 12, Jakarta Selatan", group: "STORE" as const, label: "Alamat Toko" },
        { key: "store_phone", value: "0812-3456-7890", group: "STORE" as const, label: "No. HP Toko" },
        { key: "store_receipt_note", value: "Terima kasih telah berbelanja di FJP Shop!\nBarang yang sudah dibeli tidak dapat dikembalikan.", group: "STORE" as const, label: "Catatan Struk" },
        { key: "pos_payment_methods", value: "CASH,TRANSFER", group: "POS" as const, label: "Metode Bayar" },
    ]
    for (const s of settings) {
        await prisma.setting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s })
    }
    console.log("✅ Settings")

    // ── 2. Debt Aging Categories ─────────────────────────────────────────────────
    await prisma.debtAgingCategory.deleteMany()
    await prisma.debtAgingCategory.createMany({
        data: [
            { name: "Lancar", minDays: 0, maxDays: 30, color: "#22c55e", order: 1 },
            { name: "Perhatian", minDays: 31, maxDays: 60, color: "#f59e0b", order: 2 },
            { name: "Kritis", minDays: 61, maxDays: 90, color: "#ef4444", order: 3 },
            { name: "Macet", minDays: 91, maxDays: null, color: "#7f1d1d", order: 4 },
        ],
    })
    console.log("✅ Debt aging categories")

    // ── 3. Admin User ────────────────────────────────────────────────────────────
    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@fjpshop.com"
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123456"
    let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!adminUser) {
        const result = await auth.api.signUpEmail({
            body: { name: "Admin FJP", email: adminEmail, password: adminPassword },
        })
        adminUser = result.user as any
        console.log(`✅ Admin user: ${adminEmail} / ${adminPassword}`)
    } else {
        console.log(`⏭️  Admin user already exists`)
    }
    const userId = adminUser!.id

    // ── 4. Categories ────────────────────────────────────────────────────────────
    const categoryData = [
        { name: "Minuman" },
        { name: "Makanan Ringan" },
        { name: "Rokok & Tembakau" },
        { name: "Kebutuhan Rumah" },
        { name: "Perawatan Diri" },
        { name: "Alat Tulis" },
    ]
    const categories: Record<string, string> = {}
    for (const c of categoryData) {
        const cat = await prisma.category.upsert({
            where: { name: c.name },
            update: {},
            create: c,
        })
        categories[c.name] = cat.id
    }
    console.log(`✅ ${categoryData.length} categories`)

    // ── 5. Vendors ───────────────────────────────────────────────────────────────
    const vendorData = [
        { name: "PT Sumber Makmur", phone: "021-5551234", address: "Jl. Industri No. 5, Tangerang" },
        { name: "CV Berkah Jaya", phone: "0812-9876-5432", address: "Jl. Pasar Baru No. 22, Jakarta" },
        { name: "UD Mitra Sejahtera", phone: "0856-1234-5678", address: "Jl. Raya Bogor Km 15" },
        { name: "PT Nusantara Distribusi", phone: "021-7778899", address: "Kawasan Industri MM2100, Bekasi" },
    ]
    const vendors: Record<string, string> = {}
    for (const v of vendorData) {
        const existing = await prisma.vendor.findFirst({ where: { name: v.name } })
        if (existing) {
            vendors[v.name] = existing.id
        } else {
            const vendor = await prisma.vendor.create({ data: v })
            vendors[v.name] = vendor.id
        }
    }
    console.log(`✅ ${vendorData.length} vendors`)

    // ── 6. Products ──────────────────────────────────────────────────────────────
    const productData = [
        // Minuman
        { code: "SKU-MNM001", name: "Aqua 600ml", categoryId: categories["Minuman"], unit: "pcs", buyPrice: 2500, sellPrice: 3500, minStock: 20 },
        { code: "SKU-MNM002", name: "Teh Botol Sosro 450ml", categoryId: categories["Minuman"], unit: "pcs", buyPrice: 4000, sellPrice: 5500, minStock: 15 },
        { code: "SKU-MNM003", name: "Coca Cola 330ml", categoryId: categories["Minuman"], unit: "pcs", buyPrice: 5000, sellPrice: 7000, minStock: 12 },
        { code: "SKU-MNM004", name: "Kopi Kapal Api Sachet", categoryId: categories["Minuman"], unit: "sachet", buyPrice: 1500, sellPrice: 2500, minStock: 50 },
        { code: "SKU-MNM005", name: "Susu Ultra 250ml", categoryId: categories["Minuman"], unit: "pcs", buyPrice: 4500, sellPrice: 6000, minStock: 10 },
        { code: "SKU-MNM006", name: "Pocari Sweat 500ml", categoryId: categories["Minuman"], unit: "pcs", buyPrice: 6000, sellPrice: 8500, minStock: 10 },
        // Makanan Ringan
        { code: "SKU-MKN001", name: "Indomie Goreng", categoryId: categories["Makanan Ringan"], unit: "pcs", buyPrice: 2800, sellPrice: 3500, minStock: 30 },
        { code: "SKU-MKN002", name: "Chitato Sapi Panggang 68g", categoryId: categories["Makanan Ringan"], unit: "pcs", buyPrice: 8000, sellPrice: 11000, minStock: 15 },
        { code: "SKU-MKN003", name: "Oreo Original 119g", categoryId: categories["Makanan Ringan"], unit: "pcs", buyPrice: 9000, sellPrice: 12500, minStock: 10 },
        { code: "SKU-MKN004", name: "Mie Sedaap Goreng", categoryId: categories["Makanan Ringan"], unit: "pcs", buyPrice: 2600, sellPrice: 3500, minStock: 30 },
        { code: "SKU-MKN005", name: "Biskuit Roma Kelapa", categoryId: categories["Makanan Ringan"], unit: "pcs", buyPrice: 5500, sellPrice: 7500, minStock: 12 },
        // Rokok
        { code: "SKU-RKK001", name: "Gudang Garam Surya 12", categoryId: categories["Rokok & Tembakau"], unit: "bungkus", buyPrice: 22000, sellPrice: 26000, minStock: 5 },
        { code: "SKU-RKK002", name: "Sampoerna Mild 16", categoryId: categories["Rokok & Tembakau"], unit: "bungkus", buyPrice: 28000, sellPrice: 33000, minStock: 5 },
        { code: "SKU-RKK003", name: "Djarum Super 12", categoryId: categories["Rokok & Tembakau"], unit: "bungkus", buyPrice: 21000, sellPrice: 25000, minStock: 5 },
        // Kebutuhan Rumah
        { code: "SKU-KBT001", name: "Sabun Lifebuoy 85g", categoryId: categories["Kebutuhan Rumah"], unit: "pcs", buyPrice: 3500, sellPrice: 5000, minStock: 20 },
        { code: "SKU-KBT002", name: "Rinso Cair 800ml", categoryId: categories["Kebutuhan Rumah"], unit: "botol", buyPrice: 18000, sellPrice: 24000, minStock: 8 },
        { code: "SKU-KBT003", name: "Sunlight Jeruk 755ml", categoryId: categories["Kebutuhan Rumah"], unit: "botol", buyPrice: 14000, sellPrice: 19000, minStock: 8 },
        { code: "SKU-KBT004", name: "Tisu Paseo 250 lembar", categoryId: categories["Kebutuhan Rumah"], unit: "pak", buyPrice: 12000, sellPrice: 16000, minStock: 10 },
        // Perawatan Diri
        { code: "SKU-PRW001", name: "Shampo Pantene 170ml", categoryId: categories["Perawatan Diri"], unit: "botol", buyPrice: 18000, sellPrice: 24000, minStock: 8 },
        { code: "SKU-PRW002", name: "Pasta Gigi Pepsodent 190g", categoryId: categories["Perawatan Diri"], unit: "pcs", buyPrice: 12000, sellPrice: 16000, minStock: 10 },
        { code: "SKU-PRW003", name: "Deodorant Rexona 50ml", categoryId: categories["Perawatan Diri"], unit: "pcs", buyPrice: 15000, sellPrice: 21000, minStock: 8 },
        // Alat Tulis
        { code: "SKU-ATK001", name: "Pulpen Pilot G2 Hitam", categoryId: categories["Alat Tulis"], unit: "pcs", buyPrice: 8000, sellPrice: 12000, minStock: 15 },
        { code: "SKU-ATK002", name: "Buku Tulis Sidu 58 lembar", categoryId: categories["Alat Tulis"], unit: "pcs", buyPrice: 4500, sellPrice: 7000, minStock: 20 },
        { code: "SKU-ATK003", name: "Penggaris 30cm", categoryId: categories["Alat Tulis"], unit: "pcs", buyPrice: 3000, sellPrice: 5000, minStock: 10 },
    ]

    const products: Record<string, string> = {}
    for (const p of productData) {
        const existing = await prisma.product.findUnique({ where: { code: p.code } })
        if (existing) {
            products[p.code] = existing.id
        } else {
            const prod = await prisma.product.create({ data: { ...p, stock: 0 } })
            products[p.code] = prod.id
        }
    }
    console.log(`✅ ${productData.length} products`)

    // ── 7. Purchases (barang masuk) ──────────────────────────────────────────────
    // Purchase 1: 45 hari lalu — stok awal semua produk
    const po1Code = generateCode("PO")
    const po1Date = subDays(new Date(), 45)
    await prisma.$transaction(async (tx) => {
        const po1 = await tx.purchase.create({
            data: {
                code: po1Code,
                vendorId: vendors["PT Sumber Makmur"],
                userId,
                totalAmount: 0,
                notes: "Stok awal toko",
                purchaseDate: po1Date,
            },
        })
        let total = 0
        const po1Items = [
            { code: "SKU-MNM001", qty: 100, price: 2500 },
            { code: "SKU-MNM002", qty: 60, price: 4000 },
            { code: "SKU-MNM003", qty: 48, price: 5000 },
            { code: "SKU-MNM004", qty: 200, price: 1500 },
            { code: "SKU-MNM005", qty: 40, price: 4500 },
            { code: "SKU-MNM006", qty: 36, price: 6000 },
            { code: "SKU-MKN001", qty: 120, price: 2800 },
            { code: "SKU-MKN002", qty: 60, price: 8000 },
            { code: "SKU-MKN003", qty: 48, price: 9000 },
            { code: "SKU-MKN004", qty: 120, price: 2600 },
            { code: "SKU-MKN005", qty: 48, price: 5500 },
            { code: "SKU-RKK001", qty: 30, price: 22000 },
            { code: "SKU-RKK002", qty: 30, price: 28000 },
            { code: "SKU-RKK003", qty: 30, price: 21000 },
            { code: "SKU-KBT001", qty: 80, price: 3500 },
            { code: "SKU-KBT002", qty: 30, price: 18000 },
            { code: "SKU-KBT003", qty: 30, price: 14000 },
            { code: "SKU-KBT004", qty: 40, price: 12000 },
            { code: "SKU-PRW001", qty: 30, price: 18000 },
            { code: "SKU-PRW002", qty: 40, price: 12000 },
            { code: "SKU-PRW003", qty: 30, price: 15000 },
            { code: "SKU-ATK001", qty: 60, price: 8000 },
            { code: "SKU-ATK002", qty: 80, price: 4500 },
            { code: "SKU-ATK003", qty: 40, price: 3000 },
        ]
        for (const item of po1Items) {
            const productId = products[item.code]
            const subtotal = item.qty * item.price
            total += subtotal
            await tx.purchaseItem.create({
                data: { purchaseId: po1.id, productId, quantity: item.qty, buyPrice: item.price, subtotal },
            })
            await createMovementInTx(tx, { productId, type: "PURCHASE_IN", quantity: item.qty, referenceCode: po1Code, purchaseId: po1.id })
        }
        await tx.purchase.update({ where: { id: po1.id }, data: { totalAmount: total } })
    }, { maxWait: 20000, timeout:20000 })

    // Purchase 2: 15 hari lalu — restock beberapa item + perubahan harga
    const po2Code = generateCode("PO")
    const po2Date = subDays(new Date(), 15)
    await prisma.$transaction(async (tx) => {
        const po2 = await tx.purchase.create({
            data: {
                code: po2Code,
                vendorId: vendors["CV Berkah Jaya"],
                userId,
                totalAmount: 0,
                notes: "Restock minuman dan makanan",
                purchaseDate: po2Date,
            },
        })
        let total = 0
        const po2Items = [
            { code: "SKU-MNM001", qty: 50, price: 2600, prevPrice: 2500 }, // harga naik
            { code: "SKU-MNM002", qty: 30, price: 4000 },
            { code: "SKU-MKN001", qty: 60, price: 2800 },
            { code: "SKU-MKN002", qty: 30, price: 8500, prevPrice: 8000 }, // harga naik
            { code: "SKU-RKK001", qty: 20, price: 22000 },
            { code: "SKU-RKK002", qty: 20, price: 29000, prevPrice: 28000 }, // harga naik
        ]
        for (const item of po2Items) {
            const productId = products[item.code]
            const subtotal = item.qty * item.price
            total += subtotal
            const priceChanged = !!item.prevPrice
            await tx.purchaseItem.create({
                data: {
                    purchaseId: po2.id, productId, quantity: item.qty,
                    buyPrice: item.price, previousBuyPrice: item.prevPrice ?? null,
                    priceChanged, subtotal,
                },
            })
            await createMovementInTx(tx, { productId, type: "PURCHASE_IN", quantity: item.qty, referenceCode: po2Code, purchaseId: po2.id })
            // Update harga beli produk yang naik
            if (priceChanged) {
                await tx.product.update({ where: { id: productId }, data: { buyPrice: item.price } })
            }
        }
        await tx.purchase.update({ where: { id: po2.id }, data: { totalAmount: total } })
    })

    console.log("✅ 2 purchases (stok awal + restock)")

    // ── 8. Customers ─────────────────────────────────────────────────────────────
    const customerData = [
        { name: "Budi Santoso", phone: "0812-1111-2222", address: "Jl. Melati No. 5, Jakarta" },
        { name: "Siti Rahayu", phone: "0856-3333-4444", address: "Jl. Mawar No. 12, Depok" },
        { name: "Ahmad Fauzi", phone: "0878-5555-6666", address: "Jl. Kenanga No. 8, Bekasi" },
        { name: "Dewi Lestari", phone: "0821-7777-8888", address: "Jl. Anggrek No. 3, Tangerang" },
        { name: "Rudi Hermawan", phone: "0813-9999-0000", address: "Jl. Dahlia No. 17, Bogor" },
        { name: "Rina Wati", phone: "0857-2222-3333", address: "Jl. Flamboyan No. 9, Jakarta Timur" },
        { name: "Hendra Gunawan", phone: "0819-4444-5555", address: "Jl. Cempaka No. 21, Cikarang" },
        { name: "Yuni Astuti", phone: "0822-6666-7777", address: "Jl. Teratai No. 6, Serpong" },
    ]
    const customers: Record<string, string> = {}
    for (const c of customerData) {
        const existing = await prisma.customer.findFirst({ where: { name: c.name } })
        if (existing) {
            customers[c.name] = existing.id
        } else {
            const cust = await prisma.customer.create({ data: c })
            customers[c.name] = cust.id
        }
    }
    console.log(`✅ ${customerData.length} customers`)

    // ── 9. Transactions ──────────────────────────────────────────────────────────

    // Helper: buat transaksi langsung ke DB (bypass service untuk seed)
    async function createTransaction(opts: {
        customerId?: string
        items: { code: string; qty: number; discount?: number }[]
        paidAmount: number
        paymentMethod: "CASH" | "TRANSFER"
        discountAmount?: number
        date: Date
        notes?: string
    }) {
        const { customerId, items: itemList, paidAmount, paymentMethod, discountAmount = 0, date, notes } = opts

        // Ambil produk
        const itemsWithProduct = await Promise.all(
            itemList.map(async (i) => {
                const p = await prisma.product.findUniqueOrThrow({
                    where: { id: products[i.code] },
                    select: { id: true, name: true, sellPrice: true, buyPrice: true, stock: true },
                })
                return { ...i, product: p }
            })
        )

        const subtotal = itemsWithProduct.reduce(
            (s, i) => s + (Number(i.product.sellPrice) - (i.discount ?? 0)) * i.qty, 0
        )
        const totalAmount = subtotal - discountAmount
        const debtAmount = Math.max(0, totalAmount - paidAmount)
        const overpayAmount = Math.max(0, paidAmount - totalAmount)
        const paymentStatus = paidAmount >= totalAmount ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID"
        const code = generateCode("TRX")

        return prisma.$transaction(async (tx) => {
            const trx = await tx.transaction.create({
                data: {
                    code, customerId: customerId ?? null, userId,
                    subtotal, discountAmount, totalAmount, paidAmount,
                    changeAmount: overpayAmount > 0 ? overpayAmount : 0,
                    debtAmount, paymentMethod, paymentStatus,
                    notes: notes ?? null, transactionDate: date,
                },
            })

            for (const item of itemsWithProduct) {
                await tx.transactionItem.create({
                    data: {
                        transactionId: trx.id, productId: item.product.id,
                        productName: item.product.name, quantity: item.qty,
                        sellPrice: item.product.sellPrice, buyPrice: item.product.buyPrice,
                        discountAmount: item.discount ?? 0,
                        subtotal: (Number(item.product.sellPrice) - (item.discount ?? 0)) * item.qty,
                    },
                })
                await createMovementInTx(tx, {
                    productId: item.product.id, type: "SALE_OUT",
                    quantity: -item.qty, referenceCode: code, transactionId: trx.id,
                })
            }

            if (debtAmount > 0 && customerId) {
                await tx.debt.create({
                    data: {
                        customerId, transactionId: trx.id,
                        originalAmount: debtAmount, remainingAmount: debtAmount,
                        status: paidAmount === 0 ? "UNPAID" : "PARTIAL",
                        debtDate: date,
                    },
                })
            }

            return trx
        }, { maxWait: 20000, timeout:20000 })
            
    }

    // ── Case 1: Walk-in, bayar tunai lunas (30 hari lalu) ──
    await createTransaction({
        items: [{ code: "SKU-MNM001", qty: 3 }, { code: "SKU-MKN001", qty: 2 }],
        paidAmount: 20000, paymentMethod: "CASH",
        date: subDays(new Date(), 30),
    })

    // ── Case 2: Walk-in, bayar transfer lunas (28 hari lalu) ──
    await createTransaction({
        items: [{ code: "SKU-RKK001", qty: 2 }, { code: "SKU-MNM003", qty: 3 }],
        paidAmount: 73000, paymentMethod: "TRANSFER",
        date: subDays(new Date(), 28),
    })

    // ── Case 3: Customer Budi, bayar lunas (25 hari lalu) ──
    await createTransaction({
        customerId: customers["Budi Santoso"],
        items: [{ code: "SKU-KBT001", qty: 2 }, { code: "SKU-PRW002", qty: 1 }, { code: "SKU-MNM004", qty: 5 }],
        paidAmount: 40500, paymentMethod: "CASH",
        date: subDays(new Date(), 25),
    })

    // ── Case 4: Customer Siti, HUTANG PENUH (22 hari lalu) — status UNPAID ──
    await createTransaction({
        customerId: customers["Siti Rahayu"],
        items: [{ code: "SKU-MKN002", qty: 3 }, { code: "SKU-MNM002", qty: 4 }, { code: "SKU-RKK002", qty: 2 }],
        paidAmount: 0, paymentMethod: "CASH",
        date: subDays(new Date(), 22),
        notes: "Hutang penuh — belum bayar sama sekali",
    })

    // ── Case 5: Customer Ahmad, HUTANG SEBAGIAN (20 hari lalu) — status PARTIAL ──
    await createTransaction({
        customerId: customers["Ahmad Fauzi"],
        items: [{ code: "SKU-KBT002", qty: 1 }, { code: "SKU-KBT003", qty: 1 }, { code: "SKU-PRW001", qty: 1 }],
        paidAmount: 30000, paymentMethod: "CASH",
        date: subDays(new Date(), 20),
        notes: "Bayar sebagian, sisa hutang",
    })

    // ── Case 6: Customer Dewi, dengan diskon item (18 hari lalu) ──
    await createTransaction({
        customerId: customers["Dewi Lestari"],
        items: [
            { code: "SKU-MKN003", qty: 2, discount: 1000 },
            { code: "SKU-ATK001", qty: 3 },
            { code: "SKU-MNM005", qty: 2 },
        ],
        paidAmount: 60000, paymentMethod: "TRANSFER",
        date: subDays(new Date(), 18),
    })

    // ── Case 7: Walk-in, diskon total (15 hari lalu) ──
    await createTransaction({
        items: [{ code: "SKU-RKK003", qty: 3 }, { code: "SKU-MNM001", qty: 5 }],
        paidAmount: 90000, paymentMethod: "CASH",
        discountAmount: 5000,
        date: subDays(new Date(), 15),
        notes: "Diskon pelanggan setia",
    })

    // ── Case 8: Customer Rudi, HUTANG PENUH (92 hari lalu) — aging MACET ──
    await createTransaction({
        customerId: customers["Rudi Hermawan"],
        items: [{ code: "SKU-KBT002", qty: 2 }, { code: "SKU-PRW001", qty: 2 }, { code: "SKU-MKN002", qty: 4 }],
        paidAmount: 0, paymentMethod: "CASH",
        date: subDays(new Date(), 92),
        notes: "Hutang lama — sudah macet",
    })

    // ── Case 9: Customer Rina, hutang sebagian (65 hari lalu) — aging KRITIS ──
    await createTransaction({
        customerId: customers["Rina Wati"],
        items: [{ code: "SKU-RKK001", qty: 3 }, { code: "SKU-MNM003", qty: 6 }],
        paidAmount: 50000, paymentMethod: "CASH",
        date: subDays(new Date(), 65),
        notes: "Bayar sebagian, sisa kritis",
    })

    // ── Case 10: Customer Hendra, hutang (45 hari lalu) — aging PERHATIAN ──
    await createTransaction({
        customerId: customers["Hendra Gunawan"],
        items: [{ code: "SKU-ATK002", qty: 5 }, { code: "SKU-ATK001", qty: 3 }, { code: "SKU-MNM004", qty: 10 }],
        paidAmount: 40000, paymentMethod: "TRANSFER",
        date: subDays(new Date(), 45),
    })

    // ── Case 11: Customer Yuni, bayar lunas transfer (10 hari lalu) ──
    await createTransaction({
        customerId: customers["Yuni Astuti"],
        items: [{ code: "SKU-PRW003", qty: 2 }, { code: "SKU-KBT004", qty: 3 }, { code: "SKU-MNM006", qty: 4 }],
        paidAmount: 120000, paymentMethod: "TRANSFER",
        date: subDays(new Date(), 10),
    })

    // ── Case 12: Walk-in, banyak item (7 hari lalu) ──
    await createTransaction({
        items: [
            { code: "SKU-MNM001", qty: 6 },
            { code: "SKU-MNM002", qty: 4 },
            { code: "SKU-MKN001", qty: 5 },
            { code: "SKU-MKN004", qty: 5 },
            { code: "SKU-RKK001", qty: 1 },
        ],
        paidAmount: 100000, paymentMethod: "CASH",
        date: subDays(new Date(), 7),
    })

    // ── Case 13: Customer Budi, transaksi kedua (5 hari lalu) — lunas ──
    await createTransaction({
        customerId: customers["Budi Santoso"],
        items: [{ code: "SKU-RKK002", qty: 2 }, { code: "SKU-MNM005", qty: 3 }],
        paidAmount: 84000, paymentMethod: "CASH",
        date: subDays(new Date(), 5),
    })

    // ── Case 14: Customer Siti, transaksi kedua (3 hari lalu) — hutang lagi ──
    await createTransaction({
        customerId: customers["Siti Rahayu"],
        items: [{ code: "SKU-KBT001", qty: 3 }, { code: "SKU-PRW002", qty: 2 }],
        paidAmount: 20000, paymentMethod: "CASH",
        date: subDays(new Date(), 3),
        notes: "Hutang lagi, belum bayar yang lama",
    })

    // ── Case 15: Walk-in hari ini ──
    await createTransaction({
        items: [{ code: "SKU-MNM003", qty: 2 }, { code: "SKU-MKN003", qty: 1 }],
        paidAmount: 30000, paymentMethod: "CASH",
        date: subHours(new Date(), 2),
    })

    // ── Case 16: Customer Ahmad, transaksi hari ini ──
    await createTransaction({
        customerId: customers["Ahmad Fauzi"],
        items: [{ code: "SKU-MNM001", qty: 4 }, { code: "SKU-MKN005", qty: 2 }],
        paidAmount: 29000, paymentMethod: "CASH",
        date: subMinutes(new Date(), 30),
    })

    console.log("✅ 16 transactions (berbagai case: lunas, hutang, diskon, aging)")

    // ── 10. Manual Debt Payments (bayar hutang langsung) ─────────────────────────
    // Siti bayar sebagian hutang lamanya
    const sitiDebts = await prisma.debt.findMany({
        where: { customerId: customers["Siti Rahayu"], status: { in: ["UNPAID", "PARTIAL"] } },
        orderBy: { debtDate: "asc" },
    })
    if (sitiDebts.length > 0) {
        const payAmount = 30000
        const cp = await prisma.customerPayment.create({
            data: {
                customerId: customers["Siti Rahayu"],
                amount: payAmount,
                source: "DIRECT",
                notes: "Bayar sebagian hutang",
                paymentDate: subDays(new Date(), 10),
            },
        })
        let remaining = payAmount
        for (const debt of sitiDebts) {
            if (remaining <= 0) break
            const alloc = Math.min(remaining, Number(debt.remainingAmount))
            await prisma.debtPayment.create({
                data: {
                    debtId: debt.id, amount: alloc, source: "DIRECT",
                    customerPaymentId: cp.id, paymentDate: subDays(new Date(), 10),
                },
            })
            const newRemaining = Number(debt.remainingAmount) - alloc
            await prisma.debt.update({
                where: { id: debt.id },
                data: {
                    paidAmount: { increment: alloc },
                    remainingAmount: { decrement: alloc },
                    status: newRemaining <= 0 ? "PAID" : "PARTIAL",
                    settledAt: newRemaining <= 0 ? subDays(new Date(), 10) : null,
                },
            })
            remaining -= alloc
        }
    }

    // Rudi bayar sedikit hutang macetnya
    const rudiDebts = await prisma.debt.findMany({
        where: { customerId: customers["Rudi Hermawan"], status: { in: ["UNPAID", "PARTIAL"] } },
        orderBy: { debtDate: "asc" },
    })
    if (rudiDebts.length > 0) {
        const payAmount = 50000
        const cp = await prisma.customerPayment.create({
            data: {
                customerId: customers["Rudi Hermawan"],
                amount: payAmount,
                source: "DIRECT",
                notes: "Cicilan hutang macet",
                paymentDate: subDays(new Date(), 5),
            },
        })
        let remaining = payAmount
        for (const debt of rudiDebts) {
            if (remaining <= 0) break
            const alloc = Math.min(remaining, Number(debt.remainingAmount))
            await prisma.debtPayment.create({
                data: {
                    debtId: debt.id, amount: alloc, source: "DIRECT",
                    customerPaymentId: cp.id, paymentDate: subDays(new Date(), 5),
                },
            })
            const newRemaining = Number(debt.remainingAmount) - alloc
            await prisma.debt.update({
                where: { id: debt.id },
                data: {
                    paidAmount: { increment: alloc },
                    remainingAmount: { decrement: alloc },
                    status: newRemaining <= 0 ? "PAID" : "PARTIAL",
                    settledAt: newRemaining <= 0 ? subDays(new Date(), 5) : null,
                },
            })
            remaining -= alloc
        }
    }

    console.log("✅ Manual debt payments (Siti + Rudi)")

    // ── 11. Stock Adjustment (penyesuaian manual) ────────────────────────────────
    // Produk rusak/hilang
    await prisma.$transaction(async (tx) => {
        await createMovementInTx(tx, {
            productId: products["SKU-MNM001"],
            type: "ADJUSTMENT_OUT",
            quantity: -3,
            referenceCode: "ADJ-RUSAK",
        })
    }, { maxWait: 20000, timeout:20000 })
    await prisma.$transaction(async (tx) => {
        await createMovementInTx(tx, {
            productId: products["SKU-MKN002"],
            type: "ADJUSTMENT_OUT",
            quantity: -2,
            referenceCode: "ADJ-HILANG",
        })
    }, { maxWait: 20000, timeout:20000 })
    // Koreksi stok opname
    await prisma.$transaction(async (tx) => {
        await createMovementInTx(tx, {
            productId: products["SKU-RKK001"],
            type: "ADJUSTMENT_IN",
            quantity: 5,
            referenceCode: "ADJ-OPNAME",
        })
    }, { maxWait: 20000, timeout:20000 })
    console.log("✅ Stock adjustments (rusak, hilang, opname)")

    // ── Summary ──────────────────────────────────────────────────────────────────
    const [trxCount, debtCount, productCount, customerCount] = await Promise.all([
        prisma.transaction.count(),
        prisma.debt.count({ where: { status: { in: ["UNPAID", "PARTIAL"] } } }),
        prisma.product.count(),
        prisma.customer.count(),
    ])

    console.log("\n🎉 Seeding complete!")
    console.log(`   📦 ${productCount} produk`)
    console.log(`   👥 ${customerCount} customer`)
    console.log(`   🧾 ${trxCount} transaksi`)
    console.log(`   💳 ${debtCount} hutang aktif`)
    console.log(`\n   Login: ${process.env.SEED_ADMIN_EMAIL ?? "admin@fjpshop.com"} / ${process.env.SEED_ADMIN_PASSWORD ?? "admin123456"}`)
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
