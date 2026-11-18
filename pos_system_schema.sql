-- ==============================================================================
-- JUST2PAY POS (POINT OF SALE) SYSTEM & MULTI-WALLET DATABASE MIGRATION SCRIPT
-- Execute in Supabase SQL Editor
-- ==============================================================================

-- 1. ADD POS WALLET COLUMNS TO users_profiles
ALTER TABLE IF EXISTS users_profiles
  ADD COLUMN IF NOT EXISTS pos_balance NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pos_t1_pending_balance NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pos_t0_charge_percent NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pos_t1_charge_percent NUMERIC(5,2) DEFAULT NULL;

-- 2. ADD debit_wallet_type TO OUTWARD TRANSACTION TABLES (FOR POS WALLET DEDUCTION & SOURCE REFUND)
ALTER TABLE IF EXISTS payout_transactions
  ADD COLUMN IF NOT EXISTS debit_wallet_type VARCHAR(20) DEFAULT 'main';

ALTER TABLE IF EXISTS bbps_bill_payments
  ADD COLUMN IF NOT EXISTS debit_wallet_type VARCHAR(20) DEFAULT 'main';

ALTER TABLE IF EXISTS credit_card_bill_requests
  ADD COLUMN IF NOT EXISTS debit_wallet_type VARCHAR(20) DEFAULT 'main';

-- 3. CREATE POS MACHINES MASTER TABLE
CREATE TABLE IF NOT EXISTS pos_machines (
  id VARCHAR(64) PRIMARY KEY,
  machine_name VARCHAR(255) NOT NULL,
  terminal_id VARCHAR(100) NOT NULL UNIQUE,
  serial_number VARCHAR(100),
  model VARCHAR(100) DEFAULT 'Android Smart POS',
  bank_name VARCHAR(100) DEFAULT 'HDFC Bank',
  default_t0_charge_percent NUMERIC(5,2) DEFAULT 1.20,
  default_t1_charge_percent NUMERIC(5,2) DEFAULT 0.80,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default POS machines if none exist
INSERT INTO pos_machines (id, machine_name, terminal_id, serial_number, model, bank_name, default_t0_charge_percent, default_t1_charge_percent, is_active)
VALUES 
  ('pos_m_01', 'HDFC SmartHub Android POS', 'HDFC_TID_8841', 'SN-PAX-A910-001', 'Pax A910 4G Android', 'HDFC Bank', 1.20, 0.80, true),
  ('pos_m_02', 'ICICI Merchant Swipe POS', 'ICICI_TID_9923', 'SN-VERIFONE-V200T', 'Verifone V200T High-Speed', 'ICICI Bank', 1.20, 0.80, true)
ON CONFLICT (terminal_id) DO NOTHING;

-- 4. CREATE POS PAYMENT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS pos_payment_requests (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  pos_machine_id VARCHAR(64),
  settlement_type VARCHAR(10) NOT NULL DEFAULT 'T0',
  amount NUMERIC(12,2) NOT NULL,
  charge_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  charge_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  rrn_number VARCHAR(100) NOT NULL,
  approval_code VARCHAR(100),
  card_last4 VARCHAR(10),
  card_network VARCHAR(50) DEFAULT 'Card',
  slip_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  processed_by VARCHAR(64),
  processed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  admin_commission NUMERIC(12,2) DEFAULT 0.00,
  distributor_commission NUMERIC(12,2) DEFAULT 0.00,
  super_distributor_commission NUMERIC(12,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_payment_requests_user ON pos_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pos_payment_requests_status ON pos_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_pos_payment_requests_settle ON pos_payment_requests(settlement_type);

-- 5. CREATE POS WALLET LEDGER TABLE (DEDICATED STATEMENT / PASSBOOK)
CREATE TABLE IF NOT EXISTS pos_wallet_ledger (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  type VARCHAR(10) NOT NULL, -- 'CREDIT' | 'DEBIT'
  wallet_type VARCHAR(10) NOT NULL DEFAULT 'T0', -- 'T0' | 'T1'
  category VARCHAR(50) NOT NULL, -- 'POS_SWIPE_LOAD', 'T1_SETTLEMENT_CREDIT', 'PAYOUT_DEBIT', 'LIVE_BILL_DEBIT', 'CC_BILL_DEBIT', 'REFUND_CREDIT'
  amount NUMERIC(12,2) NOT NULL,
  charge_amount NUMERIC(12,2) DEFAULT 0.00,
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  closing_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  reference_id VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_ledger_user ON pos_wallet_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_pos_ledger_wallet ON pos_wallet_ledger(wallet_type);
CREATE INDEX IF NOT EXISTS idx_pos_ledger_created ON pos_wallet_ledger(created_at DESC);

-- Enable RLS and public policies if desired:
ALTER TABLE pos_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_wallet_ledger ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pos_machines_all') THEN
    CREATE POLICY pos_machines_all ON pos_machines FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pos_requests_all') THEN
    CREATE POLICY pos_requests_all ON pos_payment_requests FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pos_ledger_all') THEN
    CREATE POLICY pos_ledger_all ON pos_wallet_ledger FOR ALL USING (true);
  END IF;
END $$;
