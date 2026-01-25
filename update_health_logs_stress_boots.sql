-- Update health_logs with Stress, Boots, Sleep and Hungry levels
ALTER TABLE public.health_logs 
DROP COLUMN IF EXISTS is_stressed,
DROP COLUMN IF EXISTS is_hungry,
ADD COLUMN IF NOT EXISTS stressed_level text DEFAULT 'Nei' CHECK (stressed_level IN ('Nei', 'Litt', 'Veldig')),
ADD COLUMN IF NOT EXISTS hungry_level text DEFAULT 'Nei' CHECK (hungry_level IN ('Nei', 'Litt', 'Veldig')),
ADD COLUMN IF NOT EXISTS boot_usage text DEFAULT 'Ingen' CHECK (boot_usage IN ('Ingen', 'Litt', 'Mye')),
ADD COLUMN IF NOT EXISTS sleep_level text DEFAULT 'Normal' CHECK (sleep_level IN ('Normal', 'Lite', 'Mye')),
ADD COLUMN IF NOT EXISTS cage_usage text DEFAULT 'Ingen' CHECK (cage_usage IN ('Ingen', 'Litt', 'Mye'));
