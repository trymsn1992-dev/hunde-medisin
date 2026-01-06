-- Allow members to update medication plans (needed for Pause/Resume)
-- First, drop existing restrictive policy if it conflicts, or just add a new permissive one.
-- "Admins can manage plans" covers ALL, but we need UPDATE for members too.

create policy "Members can update plans"
  on public.medication_plans for update
  using (
    exists (
        -- Plan -> Medicine -> Dog -> Member
      select 1 from public.medicines m
      join public.dog_members dm on m.dog_id = dm.dog_id
      where m.id = medication_plans.medicine_id
      and dm.user_id = auth.uid()
    )
  );
