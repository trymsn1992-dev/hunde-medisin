-- Add notification settings to dog_members
alter table public.dog_members 
add column if not exists missed_meds_alert_enabled boolean default true not null,
add column if not exists notify_on_dose_taken boolean default true not null;

-- Add RLS policies for members to update their own settings
create policy "Users can update their own member settings"
  on public.dog_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Ensure profiles are viewable by other dog members for the member list UI
-- (Already exists in schema.sql: "Public profiles are viewable by everyone.")
