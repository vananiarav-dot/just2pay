-- ==============================================================================
-- JUST2PAY API FUND REQUESTS RLS FIX SCRIPT
-- Execute this script in Supabase SQL Editor to allow saving API Wallet Top-Up history.
-- This disables Row Level Security (RLS) on api_fund_requests table.
-- ==============================================================================

-- 1. DISABLE ROW LEVEL SECURITY (RLS) ON api_fund_requests TABLE
ALTER TABLE IF EXISTS public.api_fund_requests DISABLE ROW LEVEL SECURITY;

-- 2. GRANT FULL PERMISSIONS TO ALL ROLES (ANON, AUTHENTICATED, SERVICE_ROLE)
GRANT ALL ON TABLE public.api_fund_requests TO anon, authenticated, service_role;

-- 3. VERIFY STATUS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'api_fund_requests';
