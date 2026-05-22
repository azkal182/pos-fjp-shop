-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposit_vendor_fk" FOREIGN KEY ("partyId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
