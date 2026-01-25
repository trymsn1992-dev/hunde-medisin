-- Remove Stripe fields
alter table public.profiles
drop column if exists stripe_customer_id,
drop column if exists subscription_price_id;

-- Add Vipps fields
alter table public.profiles
add column if not exists vipps_agreement_id text unique,
add column if not exists subscription_interval text check (subscription_interval in ('month', 'year'));

-- Ensure subscription_status can handle Vipps statuses
alter table public.profiles
drop constraint if exists profiles_subscription_status_check;

alter table public.profiles
add constraint profiles_subscription_status_check 
check (subscription_status in ('active', 'pending', 'stopped', 'expired', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired'));

-- Index for Vipps lookups
create index if not exists profiles_vipps_agreement_id_idx on public.profiles(vipps_agreement_id);
