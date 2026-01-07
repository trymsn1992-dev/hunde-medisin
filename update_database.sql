-- 1. Add profile fields to dogs table
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS breed TEXT,
ADD COLUMN IF NOT EXISTS weight TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Create Storage Bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up storage policy to allow public access to avatars
-- (Only necessary if you want strict RLS, effectively allowing anyone to read avatars)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 4. Allow authenticated users to upload to avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- 5. Allow users to update their own uploads (optional, but good)
-- Simplified: Allow authenticated users to update any avatar for now, or refine based on path
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
