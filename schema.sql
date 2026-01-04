-- Create profiles table that propagates changes from auth.users
create table public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- DOGS Table
create table public.dogs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  image_url text,
  invite_code text unique default encode(gen_random_bytes(6), 'hex'),
  created_by uuid references public.profiles(id) not null
);

alter table public.dogs enable row level security;

-- DOG MEMBERS Table
create table public.dog_members (
  id uuid default gen_random_uuid() primary key,
  dog_id uuid references public.dogs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text check (role in ('admin', 'member')) default 'member' not null,
  unique(dog_id, user_id)
);

alter table public.dog_members enable row level security;

-- MEDICINES Table
create table public.medicines (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  dog_id uuid references public.dogs(id) on delete cascade not null,
  name text not null,
  strength text, -- e.g. '50mg'
  image_url text,
  notes text
);

alter table public.medicines enable row level security;

-- MEDICATION PLANS Table
create table public.medication_plans (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  medicine_id uuid references public.medicines(id) on delete cascade not null,
  start_date timestamp with time zone default timezone('utc'::text, now()) not null,
  end_date timestamp with time zone,
  -- frequency_type: 'daily_times' (e.g. morning/evening), 'interval' (every X hours), 'as_needed'
  frequency_type text check (frequency_type in ('daily_times', 'interval', 'as_needed')) default 'daily_times' not null,
  -- schedule_times: jsonb array e.g. ["08:00", "20:00"]
  schedule_times jsonb,
  dose_text text not null, -- e.g. "1 tablet"
  active boolean default true not null
);

alter table public.medication_plans enable row level security;

-- DOSE LOGS Table
create table public.dose_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  plan_id uuid references public.medication_plans(id) on delete set null,
  medicine_id uuid references public.medicines(id) on delete set null, -- keep ref even if plan deleted
  dog_id uuid references public.dogs(id) on delete cascade not null, -- for easy querying
  taken_at timestamp with time zone default timezone('utc'::text, now()) not null,
  taken_by uuid references public.profiles(id),
  status text check (status in ('taken', 'skipped', 'missed')) default 'taken' not null,
  notes text
);

alter table public.dose_logs enable row level security;


-- RLS POLICIES

-- Helper Policy: Check if user is member of the dog
-- (For simplicity in this V1, we will do basic checks.
--  A more performant way is to have a "my_dogs" view or similar, but direct joins are fine for small scale)

-- DOGS
create policy "Members can view dogs they belong to"
  on public.dogs for select
  using (
    exists (
      select 1 from public.dog_members dm
      where dm.dog_id = dogs.id
      and dm.user_id = auth.uid()
    )
  );

create policy "Admins can update dogs"
  on public.dogs for update
  using (
    exists (
      select 1 from public.dog_members dm
      where dm.dog_id = dogs.id
      and dm.user_id = auth.uid()
      and dm.role = 'admin'
    )
  );

create policy "Users can create dogs"
  on public.dogs for insert
  with check (auth.uid() = created_by);
  -- NOTE: After creating a dog, the user must be added as admin to dog_members.
  -- This typically happens in a transaction or via a Postgres function.

-- DOG MEMBERS
create policy "Members can view other members of their dogs"
  on public.dog_members for select
  using (
    exists (
      select 1 from public.dog_members dm
      where dm.dog_id = dog_members.dog_id
      and dm.user_id = auth.uid()
    )
  );

-- MEDICINES
create policy "Members can view medicines"
  on public.medicines for select
  using (
    exists (
      select 1 from public.dog_members dm
      where dm.dog_id = medicines.dog_id
      and dm.user_id = auth.uid()
    )
  );

create policy "Admins can manage medicines"
  on public.medicines for all
  using (
    exists (
      select 1 from public.dog_members dm
      where dm.dog_id = medicines.dog_id
      and dm.user_id = auth.uid()
      and dm.role = 'admin'
    )
  );

-- PLANS
create policy "Members can view plans"
  on public.medication_plans for select
  using (
    exists (
        -- Plan -> Medicine -> Dog -> Member
      select 1 from public.medicines m
      join public.dog_members dm on m.dog_id = dm.dog_id
      where m.id = medication_plans.medicine_id
      and dm.user_id = auth.uid()
    )
  );

create policy "Admins can manage plans"
  on public.medication_plans for all
  using (
    exists (
      select 1 from public.medicines m
      join public.dog_members dm on m.dog_id = dm.dog_id
      where m.id = medication_plans.medicine_id
      and dm.user_id = auth.uid()
      and dm.role = 'admin'
    )
  );

-- LOGS
create policy "Members can view logs"
  on public.dose_logs for select
  using (
    exists (
      select 1 from public.dog_members dm
      where dm.dog_id = dose_logs.dog_id
      and dm.user_id = auth.uid()
    )
  );

create policy "Members can create logs"
  on public.dose_logs for insert
  with check (
    exists (
      select 1 from public.dog_members dm
      where dm.dog_id = dose_logs.dog_id
      and dm.user_id = auth.uid()
    )
  );
