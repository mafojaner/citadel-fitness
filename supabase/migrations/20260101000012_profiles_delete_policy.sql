-- Run this in the Supabase SQL Editor.
-- profiles had select/update/insert policies but no delete policy. Not
-- currently exploitable — the only deletion path is the delete-account
-- edge function's auth.admin.deleteUser(), which cascades via the
-- profiles.id foreign key and bypasses RLS entirely — but a future
-- client-side delete would otherwise silently no-op rather than error.

create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);
