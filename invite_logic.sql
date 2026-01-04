-- 1. Function to get dog info by invite code (Safe, bypasses RLS)
create or replace function public.get_dog_by_invite(_code text)
returns table (id uuid, name text) as $$
begin
  return query
  select d.id, d.name
  from public.dogs d
  where d.invite_code = _code;
end;
$$ language plpgsql security definer;

-- 2. Function to join a dog via code (Safe, bypasses RLS permissions to insert member)
create or replace function public.join_dog_by_invite(_code text)
returns uuid as $$
declare
  _dog_id uuid;
begin
  -- Find dog
  select id into _dog_id
  from public.dogs
  where invite_code = _code;

  if _dog_id is null then
    raise exception 'Invalid invite code';
  end if;

  -- Insert member (if not already exists)
  insert into public.dog_members (dog_id, user_id, role)
  values (_dog_id, auth.uid(), 'member')
  on conflict (dog_id, user_id) do nothing;

  return _dog_id;
end;
$$ language plpgsql security definer;
