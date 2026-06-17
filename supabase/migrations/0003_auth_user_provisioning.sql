-- Auth wiring: when someone signs up through Supabase Auth, create their
-- matching row in public.users automatically, carrying the role they chose at
-- signup (stored in auth metadata). Runs as the table owner (security definer)
-- so it bypasses RLS.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'brand')::public.user_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The two parties on a booking need to see each other's basic account row
-- (e.g. a creator seeing the booking brand's email). This widens the
-- self-only read policy from 0001 just enough for that.
create policy "users_select_booking_party" on public.users
  for select using (
    exists (
      select 1 from public.bookings b
      where (b.brand_id = auth.uid() and b.creator_id = public.users.id)
         or (b.creator_id = auth.uid() and b.brand_id = public.users.id)
    )
  );
