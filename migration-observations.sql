-- ════════════════════════════════════════════════════════════════════════
-- OBSERVATIONS & ÉCHELLES CLINIQUES
-- Grilles d'observation standardisées par résident (douleur, comportement,
-- sommeil, humeur…). Chaque relevé stocke le détail des items (jsonb), le
-- score total, le niveau d'interprétation et l'observateur.
-- À exécuter dans l'éditeur SQL Supabase SI la table n'existe pas déjà.
-- Idempotent : réexécutable sans erreur.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.observations_cliniques (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  resident_id       text not null,                 -- residents.id (passthrough, comme échéances)
  grille            text not null,                 -- douleur | comportement | sommeil | humeur
  date              date not null default current_date,
  heure             text default '',
  scores            jsonb not null default '{}'::jsonb,  -- { item_k: valeur, … }
  total             integer not null default 0,
  niveau            text default '',               -- libellé d'interprétation
  observateur       text default '',
  observateur_id    text default '',
  notes             text default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Lectures fréquentes : par résident, triées par date.
create index if not exists observations_cliniques_res_idx
  on public.observations_cliniques (etablissement_id, resident_id, date desc);

alter table public.observations_cliniques enable row level security;

-- Accès borné à l'établissement du profil connecté (même convention que le reste du site).
drop policy if exists "observations_cliniques_select" on public.observations_cliniques;
create policy "observations_cliniques_select" on public.observations_cliniques for select
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists "observations_cliniques_insert" on public.observations_cliniques;
create policy "observations_cliniques_insert" on public.observations_cliniques for insert
  with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists "observations_cliniques_update" on public.observations_cliniques;
create policy "observations_cliniques_update" on public.observations_cliniques for update
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()))
  with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists "observations_cliniques_delete" on public.observations_cliniques;
create policy "observations_cliniques_delete" on public.observations_cliniques for delete
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
