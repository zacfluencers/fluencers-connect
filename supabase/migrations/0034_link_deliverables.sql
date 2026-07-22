-- A deliverable is no longer always a file.
--
-- Meta Whitelist hands over *access* to the creator's handle (a partnership ad
-- code), and an Influencer Post hands over a *live URL*. Both were sold from
-- 22 Jul with a deal room that only accepted uploads, so a creator on either
-- had nothing to upload and no way to finish the job.

alter table public.booking_deliverables
  add column if not exists kind text not null default 'file',
  add column if not exists note text;

alter table public.booking_deliverables
  drop constraint if exists booking_deliverables_kind_check;
alter table public.booking_deliverables
  add constraint booking_deliverables_kind_check
    check (kind in ('file', 'link', 'note'));

-- A note carries no URL, so `url` can no longer be mandatory. The payload check
-- replaces it: whatever the kind, the row must actually carry something.
alter table public.booking_deliverables
  alter column url drop not null;

alter table public.booking_deliverables
  drop constraint if exists booking_deliverables_payload_check;
alter table public.booking_deliverables
  add constraint booking_deliverables_payload_check
    check (
      (kind in ('file', 'link') and url is not null and url <> '')
      or (kind = 'note' and note is not null and note <> '')
    );

-- ---------------------------------------------------------------------------
-- Brief fields the two audience services can't start without.
--
-- A creator cannot add a brand as a partner in Instagram without their Business
-- Manager ID, and cannot tag them in a post without their handle. Neither had
-- anywhere to live, so the first booking of either type would have stalled on
-- day one with each side waiting on the other.
-- ---------------------------------------------------------------------------
alter table public.booking_briefs
  add column if not exists meta_business_id text,
  add column if not exists brand_handle text;
