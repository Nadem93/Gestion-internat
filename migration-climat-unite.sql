-- ════════════════════════════════════════════════════════════════════════
-- CLIMAT PAR UNITÉ — « Météo du foyer » (tableau de bord)
-- Alimenté depuis la modale « Nouvelle transmission » (champ facultatif).
-- Un relevé par (établissement, date, unité) ; niveau = calme | tendu | difficile.
-- À exécuter dans l'éditeur SQL Supabase SI la table n'existe pas déjà.
-- Idempotent : réexécutable sans erreur.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.climat_unite (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  date              date not null,
  unite             text not null,
  niveau            text not null default 'calme',   -- calme | tendu | difficile
  note              text default '',
  saisi_par         text default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (etablissement_id, date, unite)             -- requis pour l'upsert onConflict
);

alter table public.climat_unite enable row level security;

-- Accès borné à l'établissement du profil connecté (même convention que le reste du site).
drop policy if exists "climat_unite_select" on public.climat_unite;
create policy "climat_unite_select" on public.climat_unite for select
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists "climat_unite_insert" on public.climat_unite;
create policy "climat_unite_insert" on public.climat_unite for insert
  with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists "climat_unite_update" on public.climat_unite;
create policy "climat_unite_update" on public.climat_unite for update
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()))
  with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists "climat_unite_delete" on public.climat_unite;
create policy "climat_unite_delete" on public.climat_unite for delete
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
