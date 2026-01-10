-- Create common_medicines table for autocomplete
CREATE TABLE IF NOT EXISTS public.common_medicines (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    default_strength text,
    description text,
    category text, -- e.g. 'Painkiller', 'Antibiotic'
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.common_medicines ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read (public reference table)
CREATE POLICY "Public read common medicines"
ON public.common_medicines FOR SELECT
USING (true);

-- Seed Data
INSERT INTO public.common_medicines (name, default_strength, description, category)
VALUES 
('Rimadyl', '50mg', 'Smertestillende og betennelsesdempende.', 'NSAID'),
('Onsior', '20mg', 'Smertestillende for hunder.', 'NSAID'),
('Apoquel', '16mg', 'Mot kløe og allergi.', 'Allergi'),
('Metacam', '1.5mg/ml', 'Flytende smertestillende.', 'NSAID'),
('NexGard', 'XS', 'Flått- og loppemiddel.', 'Parasitt'),
('Bravecto', '250mg', 'Langtidsvirkende flåttmiddel.', 'Parasitt'),
('Simparica', '20mg', 'Flått- og loppemiddel.', 'Parasitt'),
('Prednisolon', '5mg', 'Kortison mot betennelse/allergi.', 'Steroid'),
('Vetmedin', '5mg', 'Hjertemedisin.', 'Hjerte'),
('Furosemid', '40mg', 'Vanndrivende (hjerte).', 'Hjerte'),
('Drontal', 'Tablet', 'Ormekur.', 'Parasitt'),
('Milbemax', 'Tablet', 'Ormekur.', 'Parasitt'),
('Canikur Pro', 'Paste', 'Probiotika ved diaré.', 'Mage/Tarm'),
('Zylkene', '225mg', 'Beroligende kosttilskudd.', 'Adferd'),
('Librela', 'Injection', 'Månedlig sprøyte mot leddsmerter.', 'Smerte'),
('Cytopoint', 'Injection', 'Sprøyte mot kløe.', 'Allergi');
