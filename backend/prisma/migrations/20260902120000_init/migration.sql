CREATE TYPE "Role" AS ENUM ('OWNER', 'STAFF');
CREATE TYPE "SubscriberStatus" AS ENUM ('ACTIVE', 'PENDING', 'EXPIRED', 'SUSPENDED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER');

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'OWNER',
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "parking_lots" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "totalSpots" INTEGER NOT NULL,
    "monthlyRate" DECIMAL(10,2) NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "parking_lots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "parking_lots_ownerId_idx" ON "parking_lots"("ownerId");

CREATE TABLE "subscribers" (
    "id" UUID NOT NULL,
    "parkingLotId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "plate" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "color" TEXT,
    "spotCode" TEXT,
    "startDate" DATE NOT NULL,
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "status" "SubscriberStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "subscribers_parkingLotId_plate_key" ON "subscribers"("parkingLotId", "plate");
CREATE INDEX "subscribers_parkingLotId_status_idx" ON "subscribers"("parkingLotId", "status");

CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "subscriberId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payments_subscriberId_cycleNumber_key" ON "payments"("subscriberId", "cycleNumber");
CREATE INDEX "payments_paidAt_idx" ON "payments"("paidAt");

ALTER TABLE "parking_lots" ADD CONSTRAINT "parking_lots_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_parkingLotId_fkey" FOREIGN KEY ("parkingLotId") REFERENCES "parking_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
