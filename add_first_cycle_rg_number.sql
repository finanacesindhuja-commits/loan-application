-- Run this in your Supabase SQL editor to add the new column
-- Adds the 'First Cycle RG Number' column to the 'loans' table
ALTER TABLE loans ADD COLUMN IF NOT EXISTS first_cycle_rg_number TEXT;
