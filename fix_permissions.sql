-- Allow ordinary members (not just admins) to add and edit medicines
drop policy if exists "Admins can manage medicines" on public.medicines;
drop policy if exists "Members can manage medicines" on public.medicines; -- cleanup if exists

create policy "Members can manage medicines"
  on public.medicines for all
  using (
    exists (
      select 1 from public.dog_members dm
      where dm.dog_id = medicines.dog_id
      and dm.user_id = auth.uid()
    )
  );

-- Allow ordinary members to manage plans
drop policy if exists "Admins can manage plans" on public.medication_plans;
drop policy if exists "Members can manage plans" on public.medication_plans; -- cleanup

create policy "Members can manage plans"
  on public.medication_plans for all
  using (
    exists (
      select 1 from public.medicines m
      join public.dog_members dm on m.dog_id = dm.dog_id
      where m.id = medication_plans.medicine_id
      and dm.user_id = auth.uid()
    )
  );
