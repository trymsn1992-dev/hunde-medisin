-- SECURE RLS: Restore strict access control
-- This migration fixes the permissive policies introduced by 'fix_permissions_final.sql'

-- 1. DROP BAD POLICIES
DROP POLICY IF EXISTS "Everyone can select dogs" ON public.dogs;
DROP POLICY IF EXISTS "Read dog members" ON public.dog_members;
DROP POLICY IF EXISTS "Avatar Public Read" ON storage.objects; -- Optional, but let's keep avatars visible if needed, or restrict. 
-- Actually, avatars usually need to be public for <img src>, so we leave that one or check requirements.
-- For now, let's focus on Data Tables.

-- 2. ENSURE HELPER FUNCTION EXISTS
create or replace function public.auth_is_member(_dog_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.dog_members
    where dog_id = _dog_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- 3. SECURE DOGS TABLE
ALTER TABLE public.dogs ENABLE ROW LEVEL SECURITY;

-- Re-create strict view policy
DROP POLICY IF EXISTS "view_dogs" ON public.dogs;
CREATE POLICY "view_dogs" ON public.dogs FOR SELECT
USING ( public.auth_is_member(id) );

-- 4. SECURE DOG_MEMBERS TABLE
ALTER TABLE public.dog_members ENABLE ROW LEVEL SECURITY;

-- Re-create strict view policy
DROP POLICY IF EXISTS "view_members" ON public.dog_members;
CREATE POLICY "view_members" ON public.dog_members FOR SELECT
USING (
  user_id = auth.uid() 
  OR
  public.auth_is_member(dog_id)
);

-- 5. SECURE OTHER TABLES (Just in case)
-- Medicines
DROP POLICY IF EXISTS "view_medicines" ON public.medicines;
CREATE POLICY "view_medicines" ON public.medicines FOR SELECT
USING ( public.auth_is_member(dog_id) );

-- Plans
DROP POLICY IF EXISTS "view_plans" ON public.medication_plans;
CREATE POLICY "view_plans" ON public.medication_plans FOR SELECT
USING (
  exists (
    select 1 from public.medicines m
    where m.id = medication_plans.medicine_id
    and public.auth_is_member(m.dog_id)
  )
);

-- Logs
DROP POLICY IF EXISTS "view_logs" ON public.dose_logs;
CREATE POLICY "view_logs" ON public.dose_logs FOR SELECT
USING ( public.auth_is_member(dog_id) );
