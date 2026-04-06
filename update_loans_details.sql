-- ADD CENTER_NAME AND MEMBER_NAME TRACKING TO LOANS TABLE
ALTER TABLE IF EXISTS loans ADD COLUMN IF NOT EXISTS center_name TEXT;
ALTER TABLE IF EXISTS loans ADD COLUMN IF NOT EXISTS member_name TEXT;

-- This allows us to see the Center and Member names directly in the Loans table.
