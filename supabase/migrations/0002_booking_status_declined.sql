-- Add a "declined" state so a creator can reject a request without losing the
-- record. Terminal state, like "completed"/"refunded".
-- (Postgres 12+ allows ADD VALUE inside a migration transaction; it just can't
-- be USED in the same transaction — we don't here.)
alter type public.booking_status add value if not exists 'declined' after 'requested';
