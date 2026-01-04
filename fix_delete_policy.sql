-- Allow users to delete dose logs if they created them (taken_by = auth.uid())
-- OR if they are an admin/member of the dog.

-- First, drop the existing delete policy if it exists to be safe (or create a new one)
DROP POLICY IF EXISTS "Enable delete for users based on dog membership" ON "public"."dose_logs";
DROP POLICY IF EXISTS "Enable delete for creator" ON "public"."dose_logs";

-- Create a comprehensive DELETE policy
CREATE POLICY "Enable delete for valid members" ON "public"."dose_logs"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (
  -- 1. User logged the dose themselves
  taken_by = auth.uid()
  OR
  -- 2. User is a member of the dog profile (using our helper function if available, or direct check)
  EXISTS (
    SELECT 1 FROM dog_members
    WHERE dog_members.dog_id = dose_logs.dog_id
    AND dog_members.user_id = auth.uid()
  )
);
