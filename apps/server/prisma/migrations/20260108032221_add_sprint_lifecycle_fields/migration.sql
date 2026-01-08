-- CreateEnum
CREATE TYPE "SprintSource" AS ENUM ('HOME', 'DECK', 'PUSH');

-- AlterTable
ALTER TABLE "Sprint" ADD COLUMN     "abandonedAt" TIMESTAMP(3),
ADD COLUMN     "resumableUntil" TIMESTAMP(3),
ADD COLUMN     "source" "SprintSource" NOT NULL DEFAULT 'HOME';

-- CreateIndex
CREATE INDEX "Sprint_resumableUntil_idx" ON "Sprint"("resumableUntil");
