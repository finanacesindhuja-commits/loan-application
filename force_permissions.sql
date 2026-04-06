-- FORCE PERMISSIONS FOR ALL TABLES
-- Run this in your Supabase SQL Editor

-- 1. Disable RLS (most important)
ALTER TABLE IF EXISTS centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff DISABLE ROW LEVEL SECURITY;

-- 2. Grant all permissions to the roles our server uses
GRANT ALL ON TABLE centers TO service_role;
GRANT ALL ON TABLE members TO service_role;
GRANT ALL ON TABLE loans TO service_role;
GRANT ALL ON TABLE staff TO service_role;

GRANT ALL ON TABLE centers TO authenticated;
GRANT ALL ON TABLE members TO authenticated;
GRANT ALL ON TABLE loans TO authenticated;
GRANT ALL ON TABLE staff TO authenticated;

-- 3. Just in case, grant to anon (public) as well
GRANT ALL ON TABLE centers TO anon;
GRANT ALL ON TABLE members TO anon;
GRANT ALL ON TABLE loans TO anon;
GRANT ALL ON TABLE staff TO anon;
