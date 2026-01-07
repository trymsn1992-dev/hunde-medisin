-- Slett alle gamle oppdaterings-regler for å unngå krøll
DROP POLICY IF EXISTS "Admins can update dogs" ON dogs;
DROP POLICY IF EXISTS "Users can update their own dogs" ON dogs;
DROP POLICY IF EXISTS "Universal Update" ON dogs;

-- "Nød-nøkkelen": La alle innloggede brukere oppdatere alle hunder
CREATE POLICY "Universal Update" 
ON dogs 
FOR UPDATE 
USING ( auth.role() = 'authenticated' );

-- Sjekk at RLS faktisk er på (ellers gjelder ingen regler)
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
