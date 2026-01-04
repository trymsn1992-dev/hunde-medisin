-- FIX RLS RECURSION AND PERMISSIONS

-- 1. Create a helper function that bypasses RLS to check membership
-- This prevents the "infinite recursion" error by running as a secure system function.
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

-- 2. Drop the old problematic policies
drop policy if exists "Members can view other members of their dogs" on public.dog_members;
drop policy if exists "Members can view dogs they belong to" on public.dogs;
drop policy if exists "Admins can update dogs" on public.dogs;
drop policy if exists "Users can create dogs" on public.dogs;

-- 3. Create new, cleaner policies using the helper function

-- DOGS
-- View: If I am a member (using the safe function)
create policy "view_dogs" on public.dogs for select
using ( public.auth_is_member(id) );

-- Insert: Anyone can create a dog
create policy "insert_dogs" on public.dogs for insert
with check ( auth.uid() = created_by );

-- Update: Admins can update
create policy "update_dogs" on public.dogs for update
using (
  exists (
    select 1 from public.dog_members
    where dog_id = dogs.id
    and user_id = auth.uid()
    and role = 'admin'
  )
);

-- DOG MEMBERS
-- Select: View my own rows OR rows for dogs I'm a member of
create policy "view_members" on public.dog_members for select
using (
  user_id = auth.uid() 
  OR
  public.auth_is_member(dog_id)
);

-- Insert: I can add myself as a member IF I created the dog
-- (This is needed for the "New Dog" flow)
create policy "insert_members_creator" on public.dog_members for insert
with check (
  auth.uid() = user_id
  AND
  exists (
    select 1 from public.dogs 
    where id = dog_id 
    and created_by = auth.uid()
  )
);

-- Note: We might need policies for medicines/plans too if they recurse, 
-- but they usually check dog_members which is now protected by the function or simple checks.
-- Let's update them to use the safe function to be sure.

drop policy if exists "Members can view medicines" on public.medicines;
create policy "view_medicines" on public.medicines for select
using ( public.auth_is_member(dog_id) );

drop policy if exists "Members can view plans" on public.medication_plans;
create policy "view_plans" on public.medication_plans for select
using (
  exists (
    select 1 from public.medicines m
    where m.id = medication_plans.medicine_id
    and public.auth_is_member(m.dog_id)
  )
);

drop policy if exists "Members can view logs" on public.dose_logs;
create policy "view_logs" on public.dose_logs for select
using ( public.auth_is_member(dog_id) );

drop policy if exists "Members can create logs" on public.dose_logs;
create policy "insert_logs" on public.dose_logs for insert
with check ( public.auth_is_member(dog_id) );
