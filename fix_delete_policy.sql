-- Allow Admins to Delete Dogs
-- Currently, there is no policy for DELETE on 'dogs', causing the action to fail.

create policy "Admins can delete dogs"
  on public.dogs for delete
  using (
    exists (
      select 1 from public.dog_members dm
      where dm.dog_id = dogs.id
      and dm.user_id = auth.uid()
      and dm.role = 'admin'
    )
  );
