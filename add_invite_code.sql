-- 1. Add invite_code column if it doesn't exist
ALTER TABLE dogs 
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- 2. Generate invite codes for existing dogs that don't have one
-- Using a random 6-character string (simple implementation for now)
UPDATE dogs 
SET invite_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6))
WHERE invite_code IS NULL;

-- 3. Make it required (optional, but good for consistency)
-- ALTER TABLE dogs ALTER COLUMN invite_code SET NOT NULL;

-- 4. Create a trigger or default to auto-generate for NEW dogs?
-- Ideally handle this in the application or a trigger. 
-- For now, let's rely on the application to generate it, OR a default:
ALTER TABLE dogs 
ALTER COLUMN invite_code 
SET DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
