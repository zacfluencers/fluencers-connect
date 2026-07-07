-- 0020: make the deliverables + briefs buckets PRIVATE.
--
-- Why: both buckets were public-read, so a creator's paid content and a brand's
-- campaign assets were viewable by anyone who had (or guessed) the file URL — no
-- sign-in required. That's a confidentiality gap for paid work.
--
-- Fix: flip both buckets to private and add a *scoped* read policy — a signed-in
-- user may read a file only when it's recorded against a booking they are a
-- party on. Files are then served through short-lived signed URLs generated
-- server-side (see lib/queries.ts). The policy is deliberately narrow (it joins
-- through the deliverables/assets tables), so it does NOT let anyone list a
-- whole bucket — avoiding the "bucket allows listing" advisor.

update storage.buckets set public = false where id in ('deliverables', 'briefs');

-- A booking party can read a delivered file tied to their booking.
create policy "deliverables_read_party" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'deliverables'
    and exists (
      select 1
      from public.booking_deliverables d
      join public.bookings b on b.id = d.booking_id
      where d.storage_path = storage.objects.name
        and (b.brand_id = auth.uid() or b.creator_id = auth.uid())
    )
  );

-- A booking party can read a brief reference asset tied to their booking.
create policy "briefs_read_party" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'briefs'
    and exists (
      select 1
      from public.booking_assets a
      join public.bookings b on b.id = a.booking_id
      where a.storage_path = storage.objects.name
        and (b.brand_id = auth.uid() or b.creator_id = auth.uid())
    )
  );
