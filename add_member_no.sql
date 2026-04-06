-- Adds the non-sequential unique member number column
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_no TEXT;
