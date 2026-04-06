-- Add staff_id column to centers table
-- Each center belongs to the staff who created it
ALTER TABLE IF EXISTS centers ADD COLUMN IF NOT EXISTS staff_id TEXT;
