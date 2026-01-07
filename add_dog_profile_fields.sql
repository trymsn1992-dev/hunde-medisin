-- Add profile fields to dogs table
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS breed TEXT,
ADD COLUMN IF NOT EXISTS weight TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;
