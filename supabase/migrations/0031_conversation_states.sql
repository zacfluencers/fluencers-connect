-- Per-person state on a conversation: read, archived, and request handling.
--
-- The creator invite wave put 13 new threads into one brand inbox in a day,
-- all creator-initiated, and the list had no unread marker and no way to clear
-- anything - so an inbox that only ever grows became unusable at 15 threads.
--
-- One table rather than three because all of it is the same shape: a fact
-- about one PERSON'S relationship to one conversation. Archiving must not
-- affect the other party's inbox, and neither should reading.
--
-- Requests are computed rather than stored: a thread is a request if I'm the
-- brand, I've never sent a message in it, and it isn't a booking's deal room.
-- Only the ANSWER needs recording, which is what the two request columns do.

create table if not exists public.conversation_states (
  conversation_id uuid not null
    references public.conversations(id) on delete cascade,
  user_id uuid not null,
  -- Everything the other party sent after this is unread.
  last_read_at timestamptz,
  -- Archived, but a NEWER message brings it back - see getMyConversations.
  archived_at timestamptz,
  -- Explicit accept, for a request kept without replying yet.
  request_accepted_at timestamptz,
  -- Sticky, unlike archiving: a declined thread stays gone whatever arrives.
  request_declined_at timestamptz,
  primary key (conversation_id, user_id)
);

create index if not exists conversation_states_user_idx
  on public.conversation_states (user_id);

alter table public.conversation_states enable row level security;

-- You may only ever see or change your own row.
create policy conversation_states_select_own on public.conversation_states
  for select using (user_id = auth.uid());

-- Insert also checks you're actually a party to the conversation, so nobody
-- can litter the table with rows for threads they have nothing to do with.
create policy conversation_states_insert_own on public.conversation_states
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.brand_id = auth.uid() or c.creator_id = auth.uid())
    )
  );

create policy conversation_states_update_own on public.conversation_states
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
