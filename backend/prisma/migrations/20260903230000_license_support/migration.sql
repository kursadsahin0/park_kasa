ALTER TABLE "users" ADD COLUMN "licensePlan" TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE "users" ADD COLUMN "licenseKey" TEXT;
ALTER TABLE "users" ADD COLUMN "licenseExpiresAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "maxLots" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "users" ADD COLUMN "onboardingDone" BOOLEAN NOT NULL DEFAULT false;

UPDATE "users"
SET "licensePlan" = 'isletme',
    "maxLots" = 5,
    "licenseExpiresAt" = NOW() + INTERVAL '1 year'
WHERE "licenseExpiresAt" IS NULL;

CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "email" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_tickets_createdAt_idx" ON "support_tickets"("createdAt");

ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
