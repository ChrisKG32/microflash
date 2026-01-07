-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "SprintStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "CardResult" AS ENUM ('PASS', 'FAIL', 'SKIP');

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "Deck" ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "backlogThreshold" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "lastPushSentAt" TIMESTAMP(3),
ADD COLUMN     "maxNotificationsPerDay" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "notificationCooldownMinutes" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN     "notificationsCountThisWeek" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notificationsCountToday" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notificationsPromptedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quietHoursEnd" TEXT,
ADD COLUMN     "quietHoursStart" TEXT,
ADD COLUMN     "sprintSize" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardTag" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sprint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deckId" TEXT,
    "status" "SprintStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprintCard" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "result" "CardResult",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SprintCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tag_userId_idx" ON "Tag"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");

-- CreateIndex
CREATE INDEX "CardTag_cardId_idx" ON "CardTag"("cardId");

-- CreateIndex
CREATE INDEX "CardTag_tagId_idx" ON "CardTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "CardTag_cardId_tagId_key" ON "CardTag"("cardId", "tagId");

-- CreateIndex
CREATE INDEX "Sprint_userId_idx" ON "Sprint"("userId");

-- CreateIndex
CREATE INDEX "Sprint_deckId_idx" ON "Sprint"("deckId");

-- CreateIndex
CREATE INDEX "Sprint_status_idx" ON "Sprint"("status");

-- CreateIndex
CREATE INDEX "SprintCard_sprintId_idx" ON "SprintCard"("sprintId");

-- CreateIndex
CREATE INDEX "SprintCard_cardId_idx" ON "SprintCard"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "SprintCard_sprintId_cardId_key" ON "SprintCard"("sprintId", "cardId");

-- CreateIndex
CREATE UNIQUE INDEX "SprintCard_sprintId_order_key" ON "SprintCard"("sprintId", "order");

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTag" ADD CONSTRAINT "CardTag_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardTag" ADD CONSTRAINT "CardTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintCard" ADD CONSTRAINT "SprintCard_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintCard" ADD CONSTRAINT "SprintCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
