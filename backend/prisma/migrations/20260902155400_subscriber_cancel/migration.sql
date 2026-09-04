-- AlterTable
ALTER TABLE "subscribers" ADD COLUMN "endedAt" TIMESTAMP(3);

-- Same plate can be registered again after cancellation.
DROP INDEX "subscribers_parkingLotId_plate_key";
CREATE UNIQUE INDEX "subscribers_parkingLotId_plate_live_key"
ON "subscribers"("parkingLotId", "plate")
WHERE "status" IN ('ACTIVE', 'PENDING', 'EXPIRED', 'SUSPENDED');

-- AlterEnum (after index so the new value is not needed in this transaction)
ALTER TYPE "SubscriberStatus" ADD VALUE 'CANCELLED';
