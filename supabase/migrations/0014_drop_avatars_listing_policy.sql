-- Public bucket files are fetchable via their public URL without a select
-- policy; a broad select policy would allow listing objects in the bucket.
-- Drop it (the avatars bucket stays public for direct URL access).
drop policy if exists "avatars_public_read" on storage.objects;
