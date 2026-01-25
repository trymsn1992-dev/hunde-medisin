-- Add subscription tracking to profiles
alter table public.profiles
add column if not exists stripe_customer_id text,
add column if not exists subscription_status text check (subscription_status in ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired')),
add column if not exists subscription_end_date timestamp with time zone,
add column if not exists subscription_price_id text;

-- Add index for faster lookups if we query by stripe_customer_id
create index if not exists profiles_stripe_customer_id_idx on public.profiles(stripe_customer_id);

-- Make sure RLS allows users to read their own subscription data (already covered by "Users can view own profile", but just checking logic)
-- We typically want the SERVICE_ROLE (webhook) to update these fields, so we might not need new policies if we use service role client in API.
