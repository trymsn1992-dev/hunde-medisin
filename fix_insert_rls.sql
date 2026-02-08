-- FIX MISSING INSERT POLICIES
-- The previous 'secure_rls.sql' restored strict read access but accidentally blocked dog creation.

-- 1. DOGS: Allow authenticated users to create dogs
DROP POLICY IF EXISTS "insert_dogs" ON public.dogs;
CREATE POLICY "insert_dogs" ON public.dogs FOR INSERT
WITH CHECK ( auth.uid() = created_by );

-- 2. DOG MEMBERS: Allow users to add themselves to dogs they just created
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
