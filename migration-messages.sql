-- ════════════════════════════════════════════════════════════════════
--  Migration « Messagerie » → Supabase
--  Tables : conversations, messages
--  Convention : etablissement_id en TEXT ; RLS via public.profiles.
-- ════════════════════════════════════════════════════════════════════

-- ── CONVERSATIONS (conv_id = identifiants utilisateurs triés) ──
create table if not exists public.conversations (
  conv_id          text primary key,
  etablissement_id text not null,
  user_ids         jsonb default '[]'::jsonb,
  created_at       timestamptz default now()
);
create index if not exists conversations_etab_idx on public.conversations(etablissement_id);
alter table public.conversations enable row level security;
drop policy if exists sel_conversations on public.conversations;
drop policy if exists ins_conversations on public.conversations;
drop policy if exists upd_conversations on public.conversations;
drop policy if exists del_conversations on public.conversations;
create policy sel_conversations on public.conversations for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_conversations on public.conversations for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_conversations on public.conversations for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_conversations on public.conversations for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── MESSAGES ──
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  conv_id          text not null,
  from_user        text,
  body             text default '',
  date             timestamptz default now(),
  read_by          jsonb default '[]'::jsonb,
  created_at       timestamptz default now()
);
create index if not exists messages_etab_idx on public.messages(etablissement_id);
create index if not exists messages_conv_idx on public.messages(conv_id);
alter table public.messages enable row level security;
drop policy if exists sel_messages on public.messages;
drop policy if exists ins_messages on public.messages;
drop policy if exists upd_messages on public.messages;
drop policy if exists del_messages on public.messages;
create policy sel_messages on public.messages for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_messages on public.messages for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_messages on public.messages for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_messages on public.messages for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
