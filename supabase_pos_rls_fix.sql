-- ==============================================================================
-- JUST2PAY POS DATABASE FIX SCRIPT
-- Execute this script in Supabase SQL Editor to allow backend inserts & updates.
-- This disables Row Level Security (RLS) on POS tables, matching the rest of Just2Pay.
-- ==============================================================================

-- 1. DISABLE ROW LEVEL SECURITY (RLS) ON ALL POS TABLES
ALTER TABLE IF EXISTS public.pos_machines DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_payment_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pos_wallet_ledger DISABLE ROW LEVEL SECURITY;

-- 2. GRANT FULL PERMISSIONS TO ALL ROLES (ANON, AUTHENTICATED, SERVICE_ROLE)
GRANT ALL ON TABLE public.pos_machines TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pos_payment_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pos_wallet_ledger TO anon, authenticated, service_role;

-- 3. ENSURE DEFAULT POS MACHINES ARE PRESENT IN DATABASE
INSERT INTO public.pos_machines (id, machine_name, terminal_id, serial_number, model, bank_name, default_t0_charge_percent, default_t1_charge_percent, is_active)
VALUES 
  ('pos_m_01', 'HDFC SmartHub Android POS', 'HDFC_TID_8841', 'SN-PAX-A910-001', 'Pax A910 4G Android', 'HDFC Bank', 1.20, 0.80, true),
  ('pos_m_02', 'ICICI Merchant Swipe POS', 'ICICI_TID_9923', 'SN-VERIFONE-V200T', 'Verifone V200T High-Speed', 'ICICI Bank', 1.20, 0.80, true)
ON CONFLICT (terminal_id) DO UPDATE SET
  machine_name = EXCLUDED.machine_name,
  model = EXCLUDED.model,
  bank_name = EXCLUDED.bank_name,
  is_active = EXCLUDED.is_active;

-- 4. VERIFY TABLES STATUS
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('pos_machines', 'pos_payment_requests', 'pos_wallet_ledger');
