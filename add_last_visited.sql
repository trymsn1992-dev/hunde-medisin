-- Add last_visited_dog_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_visited_dog_id uuid REFERENCES public.dogs(id) ON DELETE SET NULL;

-- Allow users to update their own profile (policy might already exist, but ensuring it covers this column)
-- Existing policy: "Users can update own profile." -> using ( auth.uid() = id );
-- This should be sufficient.
