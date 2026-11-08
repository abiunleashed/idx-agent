-- Fix: users could not delete their own review photos.
--
-- Supabase Storage only deletes files the caller is allowed to SELECT. 0001 gave
-- insert and delete rights but no select right, so remove() silently did nothing
-- and replaced/deleted photos stayed in the bucket.
--
-- Public viewing is unaffected: the bucket is public, so photos are served by URL
-- without this policy. This only lets a user see (and therefore delete) files in
-- their own folder.

create policy "read own photos" on storage.objects for select to authenticated
  using (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);
