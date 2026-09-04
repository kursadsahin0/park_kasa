-- AlterTable
ALTER TABLE "parking_lots" ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'Europe/Istanbul';
ALTER TABLE "parking_lots" ADD COLUMN "nightStartHour" INTEGER NOT NULL DEFAULT 22;
ALTER TABLE "parking_lots" ADD COLUMN "nightEndHour" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "parking_lots" ADD COLUMN "nightHourlyRate" DECIMAL(10,2);
ALTER TABLE "parking_lots" ADD COLUMN "maxDailyCap" DECIMAL(10,2);
ALTER TABLE "parking_lots" ADD COLUMN "freeMinutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "parking_lots" ADD COLUMN "lostTicketFee" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "parking_lots" ADD COLUMN "notifyEmail" TEXT;

-- AlterTable
ALTER TABLE "visits" ADD COLUMN "lostTicket" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "visits" ADD COLUMN "adjustedAt" TIMESTAMP(3);
ALTER TABLE "visits" ADD COLUMN "adjustmentNote" TEXT;
ALTER TABLE "visits" ADD COLUMN "reservationId" UUID;

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('BOOKED', 'CHECKED_IN', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "parkingLotId" UUID NOT NULL,
    "plate" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "spotCode" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'BOOKED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_adjustments" (
    "id" UUID NOT NULL,
    "parkingLotId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "cash_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reservations_parkingLotId_startsAt_idx" ON "reservations"("parkingLotId", "startsAt");
CREATE INDEX "reservations_parkingLotId_plate_idx" ON "reservations"("parkingLotId", "plate");
CREATE INDEX "cash_adjustments_parkingLotId_createdAt_idx" ON "cash_adjustments"("parkingLotId", "createdAt");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_parkingLotId_fkey" FOREIGN KEY ("parkingLotId") REFERENCES "parking_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_adjustments" ADD CONSTRAINT "cash_adjustments_parkingLotId_fkey" FOREIGN KEY ("parkingLotId") REFERENCES "parking_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visits" ADD CONSTRAINT "visits_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
