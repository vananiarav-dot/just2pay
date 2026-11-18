-- =============================================================================
-- JUST2PAY MIGRATION SCRIPT: Change user ID prefix from aseasyswipe_ to just2pay_
-- =============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/tbqguhqgmsixtovvrkbe
-- 2. Go to "SQL Editor" in the left sidebar
-- 3. Paste this entire script and click "RUN"
-- =============================================================================

BEGIN;

-- STEP 1: Dynamically drop all Foreign Key constraints referencing users_profiles(id)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.table_schema, tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users_profiles'
    ) LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- STEP 2: Update users_profiles (Primary Key, Hierarchy, Emails)
UPDATE public.users_profiles 
SET id = REPLACE(id, 'aseasyswipe_', 'just2pay_')
WHERE id LIKE 'aseasyswipe_%';

UPDATE public.users_profiles 
SET distributor_id = REPLACE(distributor_id, 'aseasyswipe_', 'just2pay_')
WHERE distributor_id LIKE 'aseasyswipe_%';

UPDATE public.users_profiles 
SET super_distributor_id = REPLACE(super_distributor_id, 'aseasyswipe_', 'just2pay_')
WHERE super_distributor_id LIKE 'aseasyswipe_%';

UPDATE public.users_profiles 
SET email = REPLACE(email, '@aseasyswipe.com', '@just2pay.in')
WHERE email LIKE '%@aseasyswipe.com';

-- STEP 3: Update all child transaction tables
UPDATE public.bbps_bill_payments 
SET user_id = REPLACE(user_id, 'aseasyswipe_', 'just2pay_')
WHERE user_id LIKE 'aseasyswipe_%';

UPDATE public.payout_transactions 
SET user_id = REPLACE(user_id, 'aseasyswipe_', 'just2pay_')
WHERE user_id LIKE 'aseasyswipe_%';

UPDATE public.qr_payment_requests 
SET user_id = REPLACE(user_id, 'aseasyswipe_', 'just2pay_')
WHERE user_id LIKE 'aseasyswipe_%';

UPDATE public.wallet_ledger 
SET user_id = REPLACE(user_id, 'aseasyswipe_', 'just2pay_')
WHERE user_id LIKE 'aseasyswipe_%';

UPDATE public.credit_card_bill_requests 
SET user_id = REPLACE(user_id, 'aseasyswipe_', 'just2pay_')
WHERE user_id LIKE 'aseasyswipe_%';

UPDATE public.payout_beneficiaries 
SET user_id = REPLACE(user_id, 'aseasyswipe_', 'just2pay_')
WHERE user_id LIKE 'aseasyswipe_%';

UPDATE public.payout_verifications 
SET user_id = REPLACE(user_id, 'aseasyswipe_', 'just2pay_')
WHERE user_id LIKE 'aseasyswipe_%';

UPDATE public.kyc_verifications 
SET user_id = REPLACE(user_id, 'aseasyswipe_', 'just2pay_')
WHERE user_id LIKE 'aseasyswipe_%';

UPDATE public.api_fund_requests 
SET user_id = REPLACE(user_id, 'aseasyswipe_', 'just2pay_')
WHERE user_id LIKE 'aseasyswipe_%';

-- STEP 4: Update admin_profiles
UPDATE public.admin_profiles 
SET id = REPLACE(id, 'aseasyswipe_', 'just2pay_')
WHERE id LIKE 'aseasyswipe_%';

UPDATE public.admin_profiles 
SET email = REPLACE(email, '@aseasyswipe.com', '@just2pay.in')
WHERE email LIKE '%@aseasyswipe.com';

-- STEP 5: Re-add all Foreign Keys with ON UPDATE CASCADE (Future-proof flexibility)
ALTER TABLE public.users_profiles 
  ADD CONSTRAINT users_profiles_distributor_id_fkey 
  FOREIGN KEY (distributor_id) REFERENCES public.users_profiles(id) 
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.users_profiles 
  ADD CONSTRAINT users_profiles_super_distributor_id_fkey 
  FOREIGN KEY (super_distributor_id) REFERENCES public.users_profiles(id) 
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.bbps_bill_payments 
  ADD CONSTRAINT bbps_bill_payments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users_profiles(id) 
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.payout_transactions 
  ADD CONSTRAINT payout_transactions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users_profiles(id) 
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.qr_payment_requests 
  ADD CONSTRAINT qr_payment_requests_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users_profiles(id) 
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.wallet_ledger 
  ADD CONSTRAINT wallet_ledger_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users_profiles(id) 
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.credit_card_bill_requests 
  ADD CONSTRAINT credit_card_bill_requests_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users_profiles(id) 
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.payout_beneficiaries 
  ADD CONSTRAINT payout_beneficiaries_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users_profiles(id) 
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.payout_verifications 
  ADD CONSTRAINT payout_verifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users_profiles(id) 
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.kyc_verifications 
  ADD CONSTRAINT kyc_verifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users_profiles(id) 
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.api_fund_requests 
  ADD CONSTRAINT api_fund_requests_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users_profiles(id) 
  ON UPDATE CASCADE ON DELETE CASCADE;

COMMIT;
