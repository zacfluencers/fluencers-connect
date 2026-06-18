-- Let a creator view a brand's profile if they share a conversation or booking
-- with them (so "view profile" works from messages even if the brand has since
-- turned off "looking for creators"). Adds to the existing select policy (OR'd).
create policy "brand_profiles_select_related" on public.brand_profiles
  for select using (
    exists (
      select 1 from public.conversations c
      where c.brand_id = brand_profiles.user_id and c.creator_id = auth.uid()
    )
    or exists (
      select 1 from public.bookings b
      where b.brand_id = brand_profiles.user_id and b.creator_id = auth.uid()
    )
  );
