-- E1.1: Convert Priority enum to numeric (0-100)
-- Mapping: LOW=25, MEDIUM=50, HIGH=75

-- Step 1: Add temporary integer columns
ALTER TABLE "Deck" ADD COLUMN "priority_new" INTEGER;
ALTER TABLE "Card" ADD COLUMN "priority_new" INTEGER;

-- Step 2: Backfill numeric values from enum
UPDATE "Deck" SET "priority_new" = CASE
  WHEN "priority" = 'LOW' THEN 25
  WHEN "priority" = 'MEDIUM' THEN 50
  WHEN "priority" = 'HIGH' THEN 75
  ELSE 50
END;

UPDATE "Card" SET "priority_new" = CASE
  WHEN "priority" = 'LOW' THEN 25
  WHEN "priority" = 'MEDIUM' THEN 50
  WHEN "priority" = 'HIGH' THEN 75
  ELSE 50
END;

-- Step 3: Drop old enum columns
ALTER TABLE "Deck" DROP COLUMN "priority";
ALTER TABLE "Card" DROP COLUMN "priority";

-- Step 4: Rename new columns to priority
ALTER TABLE "Deck" RENAME COLUMN "priority_new" TO "priority";
ALTER TABLE "Card" RENAME COLUMN "priority_new" TO "priority";

-- Step 5: Set NOT NULL and default
ALTER TABLE "Deck" ALTER COLUMN "priority" SET NOT NULL;
ALTER TABLE "Deck" ALTER COLUMN "priority" SET DEFAULT 50;

ALTER TABLE "Card" ALTER COLUMN "priority" SET NOT NULL;
ALTER TABLE "Card" ALTER COLUMN "priority" SET DEFAULT 50;

-- Step 6: Add CHECK constraints for valid range (0-100)
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_priority_range" CHECK ("priority" >= 0 AND "priority" <= 100);
ALTER TABLE "Card" ADD CONSTRAINT "Card_priority_range" CHECK ("priority" >= 0 AND "priority" <= 100);

-- Step 7: Drop the Priority enum type (no longer used)
DROP TYPE "Priority";
