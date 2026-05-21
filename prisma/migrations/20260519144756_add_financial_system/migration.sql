-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CUSTOMER', 'VENDOR');

-- CreateEnum
CREATE TYPE "DepositSource" AS ENUM ('OVERPAY_TRANSACTION', 'OVERPAY_PURCHASE', 'MANUAL');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('INVOICE', 'PAYMENT_IN', 'PAYMENT_OUT', 'DEPOSIT_IN', 'DEPOSIT_OUT', 'DEPOSIT_RETURN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "EntryDirection" AS ENUM ('DEBIT', 'CREDIT');

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "changeAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "debtAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "depositCreated" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "depositUsed" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "product_vendor_prices" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "buyPrice" DECIMAL(15,2) NOT NULL,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "lastOrderAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_vendor_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_debts" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "originalAmount" DECIMAL(15,2) NOT NULL,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(15,2) NOT NULL,
    "status" "DebtStatus" NOT NULL DEFAULT 'UNPAID',
    "debtDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_debt_payments" (
    "id" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "PaymentSource" NOT NULL,
    "notes" TEXT,
    "vendorPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_debt_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_payments" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "PaymentSource" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" TEXT NOT NULL,
    "partyType" "PartyType" NOT NULL,
    "partyId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "usedAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "returnedAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2) NOT NULL,
    "source" "DepositSource" NOT NULL,
    "sourceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_usages" (
    "id" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "usageType" TEXT NOT NULL,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_accounts" (
    "id" TEXT NOT NULL,
    "partyType" "PartyType" NOT NULL,
    "partyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "direction" "EntryDirection" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "runningBalance" DECIMAL(15,2) NOT NULL,
    "description" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod",
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_vendor_prices_productId_vendorId_key" ON "product_vendor_prices"("productId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_debts_purchaseId_key" ON "vendor_debts"("purchaseId");

-- CreateIndex
CREATE INDEX "deposits_partyType_partyId_idx" ON "deposits"("partyType", "partyId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_partyType_partyId_key" ON "ledger_accounts"("partyType", "partyId");

-- CreateIndex
CREATE INDEX "ledger_entries_accountId_createdAt_idx" ON "ledger_entries"("accountId", "createdAt");

-- AddForeignKey
ALTER TABLE "product_vendor_prices" ADD CONSTRAINT "product_vendor_prices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_vendor_prices" ADD CONSTRAINT "product_vendor_prices_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_debts" ADD CONSTRAINT "vendor_debts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_debts" ADD CONSTRAINT "vendor_debts_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_debt_payments" ADD CONSTRAINT "vendor_debt_payments_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "vendor_debts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_debt_payments" ADD CONSTRAINT "vendor_debt_payments_vendorPaymentId_fkey" FOREIGN KEY ("vendorPaymentId") REFERENCES "vendor_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payments" ADD CONSTRAINT "vendor_payments_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposit_customer_fk" FOREIGN KEY ("partyId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_usages" ADD CONSTRAINT "deposit_usages_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "deposits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
