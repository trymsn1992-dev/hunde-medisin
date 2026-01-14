-- 1. Add column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_visited_dog_id uuid REFERENCES public.dogs(id) ON DELETE SET NULL;

-- 2. Ensure users can UPDATE their own profile
-- Check if policy exists first to avoid error, or just drop and recreate for safety/idempotency
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING ( auth.uid() = id );

-- 3. Ensure users can SELECT their own profile (usually default, but good to ensure)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING ( auth.uid() = id );
