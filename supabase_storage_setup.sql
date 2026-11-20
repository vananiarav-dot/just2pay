-- =========================================================================
-- Just2Pay: Supabase Storage Bucket & Realtime Configuration Script
-- Instructions: Copy and run this script in Supabase Dashboard -> SQL Editor
-- =========================================================================

-- 1. Create Public Storage Bucket 'qr-receipts' for QR Payment Slips
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'qr-receipts',
    'qr-receipts',
    true,
    5242880, -- 5 MB file size limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- 2. Storage RLS Policies: Allow Public Read (CDN Caching)
DROP POLICY IF EXISTS "Public Access QR Receipts" ON storage.objects;
CREATE POLICY "Public Access QR Receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'qr-receipts');

-- 3. Storage RLS Policies: Allow Insert/Upload for All Users (Anon & Authenticated)
DROP POLICY IF EXISTS "Allow Upload QR Receipts" ON storage.objects;
CREATE POLICY "Allow Upload QR Receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'qr-receipts');

DROP POLICY IF EXISTS "Allow Update QR Receipts" ON storage.objects;
CREATE POLICY "Allow Update QR Receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'qr-receipts');

-- 4. Enable Supabase Realtime for table 'qr_payment_requests' (Instant Push, 0 KB Polling)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'qr_payment_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE qr_payment_requests;
    END IF;
END $$;

-- 5. Verification Check (Will show bucket details in results)
SELECT id, name, public, file_size_limit, created_at 
FROM storage.buckets 
WHERE id = 'qr-receipts';
