-- Remove Vipps columns
ALTER TABLE profiles 
DROP COLUMN IF EXISTS vipps_agreement_id,
DROP COLUMN IF EXISTS subscription_interval;

-- Restore Stripe columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS subscription_price_id text,
ADD COLUMN IF NOT EXISTS subscription_status text default 'active',
ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;

-- Add index for stripe customer lookup (webhook optimization)
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx ON profiles(stripe_customer_id);
