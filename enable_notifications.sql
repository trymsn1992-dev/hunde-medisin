-- Create push_subscriptions table
create table public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.push_subscriptions enable row level security;

create policy "Users can manage their own subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Update dogs table with notification settings
alter table public.dogs 
add column if not exists missed_meds_alert_enabled boolean default false not null,
add column if not exists missed_meds_delay_minutes integer default 120 not null;

-- Create sent_notifications table to track what we've sent
create table public.sent_notifications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  plan_id uuid references public.medication_plans(id) on delete cascade not null,
  log_date date not null, -- The specific date/slot meant for the log
  sent_to_user_id uuid references public.profiles(id) on delete cascade not null
);

alter table public.sent_notifications enable row level security;

-- Only system/cron technically needs this, but admins might want to see history?
-- For now, let's allow members to see what notification was sent
create policy "Members can view sent notifications"
  on public.sent_notifications for select
  using (
    exists (
      select 1 from public.medication_plans mp
      join public.medicines m on mp.medicine_id = m.id
      join public.dog_members dm on m.dog_id = dm.dog_id
      where mp.id = sent_notifications.plan_id
      and dm.user_id = auth.uid()
    )
  );
