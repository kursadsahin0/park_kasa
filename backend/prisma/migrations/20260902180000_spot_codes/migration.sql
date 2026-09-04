-- AlterTable
ALTER TABLE "parking_lots" ADD COLUMN "spotPrefix" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "visits" ADD COLUMN "spotCode" TEXT;

-- CreateIndex
CREATE INDEX "visits_parkingLotId_spotCode_idx" ON "visits"("parkingLotId", "spotCode");
