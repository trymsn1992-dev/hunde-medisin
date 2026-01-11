create table if not exists health_summaries (
  id uuid default gen_random_uuid() primary key,
  dog_id uuid references dogs(id) on delete cascade not null,
  week_start_date date not null,
  summary_text text not null,
  created_at timestamptz default now(),
  unique(dog_id, week_start_date)
);

alter table health_summaries enable row level security;

create policy "Users can view health summaries for their dogs"
on health_summaries for select
using (
  exists (
    select 1 from dog_members
    where dog_members.dog_id = health_summaries.dog_id
    and dog_members.user_id = auth.uid()
  )
);

create policy "Users can insert health summaries for their dogs"
on health_summaries for insert
with check (
  exists (
    select 1 from dog_members
    where dog_members.dog_id = health_summaries.dog_id
    and dog_members.user_id = auth.uid()
  )
);
