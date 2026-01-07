-- 1. FIX DOG_MEMBERS ACCESS (Critical for the Admin check to work)
-- We need to be able to READ who is an admin to know if you can update.
ALTER TABLE dog_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read dog members" ON dog_members;
CREATE POLICY "Read dog members" ON dog_members FOR SELECT USING (true);

-- 2. FIX DOGS UPDATE POLICY
DROP POLICY IF EXISTS "Admins can update dogs" ON dogs;
DROP POLICY IF EXISTS "Users can update their own dogs" ON dogs;

CREATE POLICY "Admins can update dogs"
ON dogs
FOR UPDATE
USING (
    -- You are the creator
    created_by = auth.uid()
    OR
    -- OR you are listed as an admin in dog_members
    EXISTS (
        SELECT 1 FROM dog_members
        WHERE dog_members.dog_id = dogs.id
        AND dog_members.user_id = auth.uid()
        AND dog_members.role = 'admin'
    )
);

-- 3. ENSURE YOU CAN VIEW THE DOGS (Select)
DROP POLICY IF EXISTS "Everyone can select dogs" ON dogs;
CREATE POLICY "Everyone can select dogs" ON dogs FOR SELECT USING (true);
-- (Or restrict to members if desired, but let's keep it open for debugging)

-- 4. STORAGE PERMISSIONS (For the image upload)
-- Make sure the 'avatars' bucket exists and is public
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow uploading to avatars
DROP POLICY IF EXISTS "Avatar Upload" ON storage.objects;
CREATE POLICY "Avatar Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- Allow reading avatars
DROP POLICY IF EXISTS "Avatar Public Read" ON storage.objects;
CREATE POLICY "Avatar Public Read"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );
