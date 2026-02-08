-- FIX RLS FINAL: Allow creators to view dogs before they are members
-- The previous error happened because you couldn't SELECT the dog you just created (since you weren't a member yet).

-- 1. Update DOGS Select Policy
DROP POLICY IF EXISTS "view_dogs" ON public.dogs;
CREATE POLICY "view_dogs" ON public.dogs FOR SELECT
USING ( 
    public.auth_is_member(id) 
    OR 
    created_by = auth.uid() 
);

-- 2. Ensure Insert Policies are definitely present (from previous fix)
DROP POLICY IF EXISTS "insert_dogs" ON public.dogs;
CREATE POLICY "insert_dogs" ON public.dogs FOR INSERT
WITH CHECK ( auth.uid() = created_by );

-- 3. Ensure Member Insert is open enough
DROP POLICY IF EXISTS "insert_members_creator" ON public.dog_members;
CREATE POLICY "insert_members_creator" ON public.dog_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND
  exists (
    select 1 from public.dogs 
    where id = dog_id 
    and created_by = auth.uid()
  )
);
