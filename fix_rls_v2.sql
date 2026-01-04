-- FIX RLS V2: Allow creators to see their dogs before membership is added

-- 1. Helper Function (Same as before, ensuring it exists)
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

-- 2. Reset Policies for DOGS and DOG_MEMBERS
drop policy if exists "view_dogs" on public.dogs;
drop policy if exists "insert_dogs" on public.dogs;
drop policy if exists "update_dogs" on public.dogs;
drop policy if exists "view_members" on public.dog_members;
drop policy if exists "insert_members_creator" on public.dog_members;
-- Access old names just in case
drop policy if exists "Members can view dogs they belong to" on public.dogs;
drop policy if exists "Users can create dogs" on public.dogs;
drop policy if exists "Admins can update dogs" on public.dogs;

-- 3. New Policies

-- DOGS
-- View: Member OR Creator (Crucial for the creation flow!)
create policy "view_dogs" on public.dogs for select
using ( 
  created_by = auth.uid() 
  OR 
  public.auth_is_member(id) 
);

-- Insert: Anyone can create
create policy "insert_dogs" on public.dogs for insert
with check ( auth.uid() = created_by );

-- Update: Admins only
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
-- View: My membership OR members of my dogs
create policy "view_members" on public.dog_members for select
using (
  user_id = auth.uid() 
  OR
  public.auth_is_member(dog_id)
);

-- Insert: Add yourself to a dog you just created
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
