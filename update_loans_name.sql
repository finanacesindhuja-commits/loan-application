-- ADD STAFF_NAME TRACKING TO LOANS TABLE
ALTER TABLE IF EXISTS loans ADD COLUMN IF NOT EXISTS staff_name TEXT;

-- This allows us to see the NAME of the staff who submitted the loan.
