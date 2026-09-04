-- CreateTable
CREATE TABLE "day_closes" (
    "id" UUID NOT NULL,
    "parkingLotId" UUID NOT NULL,
    "businessDate" DATE NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedById" UUID NOT NULL,
    "checkoutCount" INTEGER NOT NULL,
    "paidCheckouts" INTEGER NOT NULL,
    "subscriberCheckouts" INTEGER NOT NULL,
    "hourlyRevenue" DECIMAL(10,2) NOT NULL,
    "subscriberRevenue" DECIMAL(10,2) NOT NULL,
    "totalRevenue" DECIMAL(10,2) NOT NULL,
    "cashTotal" DECIMAL(10,2) NOT NULL,
    "cardTotal" DECIMAL(10,2) NOT NULL,
    "transferTotal" DECIMAL(10,2) NOT NULL,
    "stillInside" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "day_closes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "day_closes_parkingLotId_businessDate_key" ON "day_closes"("parkingLotId", "businessDate");

-- CreateIndex
CREATE INDEX "day_closes_businessDate_idx" ON "day_closes"("businessDate");

-- AddForeignKey
ALTER TABLE "day_closes" ADD CONSTRAINT "day_closes_parkingLotId_fkey" FOREIGN KEY ("parkingLotId") REFERENCES "parking_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_closes" ADD CONSTRAINT "day_closes_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
