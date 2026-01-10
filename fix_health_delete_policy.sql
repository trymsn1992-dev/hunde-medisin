-- Enable RLS on health_logs just in case
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;

-- Allow members to delete health logs for dogs they are part of
CREATE POLICY "Members can delete health logs"
ON public.health_logs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.dog_members dm
    WHERE dm.dog_id = health_logs.dog_id
    AND dm.user_id = auth.uid()
  )
);
