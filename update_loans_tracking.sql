-- ADD STAFF_ID TRACKING TO LOANS TABLE
ALTER TABLE IF EXISTS loans ADD COLUMN IF NOT EXISTS staff_id TEXT;

-- This allows us to track who submitted each loan.
