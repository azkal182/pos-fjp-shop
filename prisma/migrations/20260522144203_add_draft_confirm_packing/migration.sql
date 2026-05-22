-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "reservedStock" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedBy" TEXT,
ADD COLUMN     "packingFee" DECIMAL(15,2) NOT NULL DEFAULT 0,
ALTER COLUMN "paidAmount" SET DEFAULT 0,
ALTER COLUMN "paymentMethod" SET DEFAULT 'CASH',
ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID';
