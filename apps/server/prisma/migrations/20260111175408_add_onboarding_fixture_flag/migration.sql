-- AlterTable
ALTER TABLE "Deck" ADD COLUMN     "isOnboardingFixture" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "maxNotificationsPerDay" SET DEFAULT 5;

-- CreateIndex
CREATE INDEX "Deck_isOnboardingFixture_idx" ON "Deck"("isOnboardingFixture");
