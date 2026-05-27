-- Deposit bersifat polymorphic (CUSTOMER/VENDOR) via (partyType, partyId).
-- Jangan gunakan FK tunggal ke tabel vendors.
ALTER TABLE "deposits" DROP CONSTRAINT IF EXISTS "deposit_vendor_fk";
