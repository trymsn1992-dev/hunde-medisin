-- Allow users to update dogs they created or are members of
-- First, drop existing policy if it conflicts (optional, but safe)
DROP POLICY IF EXISTS "Users can update their own dogs" ON dogs;
DROP POLICY IF EXISTS "Admins can update dogs" ON dogs;

-- Create comprehensive update policy
CREATE POLICY "Admins can update dogs"
ON dogs
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM dog_members 
    WHERE dog_id = dogs.id 
    AND role = 'admin'
  )
  OR 
  created_by = auth.uid()
);

-- Ensure RLS is on
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
