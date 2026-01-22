-- Add cone_usage to health_logs
ALTER TABLE public.health_logs 
ADD COLUMN IF NOT EXISTS cone_usage text CHECK (cone_usage IN ('Ingen', 'Litt', 'Mye', 'Ekstremt'));

-- Update RLS to ensure new column is accessible (usually automatic for existing policies if they use specific columns or wildcard)
-- Just in case, grant update on policies if detailed column security was used (unlikely here)
