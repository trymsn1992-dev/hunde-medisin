-- FIX DOSE LOGS POLICIES
-- Ensure we can definitely insert and view logs!

-- 1. Drop old policies (both original names and potential new names from previous attempts)
drop policy if exists "Members can view logs" on public.dose_logs;
drop policy if exists "Members can create logs" on public.dose_logs;
drop policy if exists "view_logs" on public.dose_logs;
drop policy if exists "insert_logs" on public.dose_logs;

-- 2. Create Simple, Safe Policies using the helper function
-- (We assume public.auth_is_member exists from the previous fix. 
--  If not, let's redefine it just in case, it's cheap.)

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

-- VIEW: Can see logs for my dogs
create policy "view_logs" on public.dose_logs for select
using ( public.auth_is_member(dog_id) );

-- INSERT: Can create logs for my dogs
create policy "insert_logs" on public.dose_logs for insert
with check ( public.auth_is_member(dog_id) );

-- UPDATE: (Optional for now) Can update logs for my dogs
create policy "update_logs" on public.dose_logs for update
using ( public.auth_is_member(dog_id) );

-- DELETE: Can delete logs for my dogs
create policy "delete_logs" on public.dose_logs for delete
using ( public.auth_is_member(dog_id) );
