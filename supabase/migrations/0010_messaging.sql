-- Real messaging: conversations between a brand and a creator, with messages.
-- A conversation can be tied to a booking (the deal room) or be a direct
-- creator→brand outreach (booking_id null).

create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  brand_id   uuid not null references public.users (id) on delete cascade,
  creator_id uuid not null references public.users (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- One direct conversation per (brand, creator); one conversation per booking.
create unique index conversations_direct_unique
  on public.conversations (brand_id, creator_id) where booking_id is null;
create unique index conversations_booking_unique
  on public.conversations (booking_id) where booking_id is not null;
create index conversations_brand_idx on public.conversations (brand_id);
create index conversations_creator_idx on public.conversations (creator_id);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.users (id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 4000),
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Conversations: visible to and creatable by the two parties.
create policy "conversations_select_party" on public.conversations
  for select using (auth.uid() = brand_id or auth.uid() = creator_id);

create policy "conversations_insert_party" on public.conversations
  for insert with check (auth.uid() = brand_id or auth.uid() = creator_id);

-- Messages: visible if you're in the conversation; you post as yourself.
create policy "messages_select_party" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.brand_id = auth.uid() or c.creator_id = auth.uid())
    )
  );

create policy "messages_insert_party" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.brand_id = auth.uid() or c.creator_id = auth.uid())
    )
  );

-- Let conversation parties read each other's basic account row (email).
create policy "users_select_conversation_party" on public.users
  for select using (
    exists (
      select 1 from public.conversations c
      where (c.brand_id = auth.uid() and c.creator_id = public.users.id)
         or (c.creator_id = auth.uid() and c.brand_id = public.users.id)
    )
  );
