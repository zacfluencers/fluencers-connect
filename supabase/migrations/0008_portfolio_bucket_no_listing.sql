-- A public bucket already serves images via their public URL without any RLS
-- policy. The broad SELECT policy from 0005 additionally let clients *list*
-- every file in the bucket, which we don't want. Drop it — image display still
-- works through the public object URL.
drop policy if exists "portfolio_public_read" on storage.objects;
