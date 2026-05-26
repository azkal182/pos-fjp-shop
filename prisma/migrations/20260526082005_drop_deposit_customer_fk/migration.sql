-- Drop deposit_customer_fk karena satu kolom partyId tidak bisa punya dua FK
-- ke tabel berbeda (customers dan vendors) sekaligus.
-- Integritas dijaga oleh partyType field + deposit_vendor_fk.
ALTER TABLE "deposits" DROP CONSTRAINT IF EXISTS "deposit_customer_fk";
