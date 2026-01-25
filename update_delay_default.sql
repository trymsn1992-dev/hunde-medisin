-- Change default delay from 120 to 60 minutes
ALTER TABLE public.dogs 
ALTER COLUMN missed_meds_delay_minutes SET DEFAULT 60;

-- Update existing dogs to 60 minutes (assuming they were on default)
UPDATE public.dogs 
SET missed_meds_delay_minutes = 60 
WHERE missed_meds_delay_minutes = 120;
