-- AlterTable
ALTER TABLE "parking_lots" ADD COLUMN "hourlyRate" DECIMAL(10,2) NOT NULL DEFAULT 50;

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "visits" (
    "id" UUID NOT NULL,
    "parkingLotId" UUID NOT NULL,
    "plate" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "billedHours" INTEGER,
    "hourlyRate" DECIMAL(10,2),
    "totalPrice" DECIMAL(10,2),
    "isSubscriber" BOOLEAN NOT NULL DEFAULT false,
    "status" "VisitStatus" NOT NULL DEFAULT 'OPEN',
    "method" "PaymentMethod",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "visits_parkingLotId_status_idx" ON "visits"("parkingLotId", "status");
CREATE INDEX "visits_parkingLotId_plate_idx" ON "visits"("parkingLotId", "plate");

ALTER TABLE "visits" ADD CONSTRAINT "visits_parkingLotId_fkey" FOREIGN KEY ("parkingLotId") REFERENCES "parking_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
