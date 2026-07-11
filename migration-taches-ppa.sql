-- ════════════════════════════════════════════════════════════════════
--  Migration « Journée / Ma tournée » (P5) → Supabase
--  Le projet personnalisé décomposé en tâches quotidiennes reliées aux
--  objectifs, cochées sur le terrain avec le niveau de soutien apporté.
--  Tables : taches_ppa (les tâches), taches_coches (le journal par jour).
--  À exécuter dans le SQL Editor de Supabase (une seule fois).
--  Convention : etablissement_id en TEXT ; RLS via public.profiles.
--
--  GARDE-FOU ÉTHIQUE (décision produit) : aucune statistique de complétion
--  PAR PROFESSIONNEL ne doit être construite sur ces tables — la coche trace
--  l'accompagnement de la personne, jamais le rendement du salarié.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. TÂCHES du projet personnalisé ──
create table if not exists public.taches_ppa (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  resident_id      text not null,
  resident_name    text default '',
  libelle          text not null,
  objectif         text default '',            -- libellé de l'objectif PPA relié (🎯)
  ppe_id           uuid,                        -- avenant d'origine (facultatif)
  moment           text default 'matin',        -- matin / aprem / soir
  heure            text default '',             -- indicative, ex. "08:00"
  recurrence       jsonb default '{"type":"quotidien"}'::jsonb,  -- {type:'quotidien'} | {type:'jours', jours:[1,3,5]} (0=dim)
  consigne         text default '',             -- mode d'emploi (remplaçants)
  soutien_attendu  text default '',             -- autonomie/supervision/verbal/partiel/total
  actif            boolean default true,
  created_by       text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists taches_ppa_etab_idx on public.taches_ppa(etablissement_id);
create index if not exists taches_ppa_resident_idx on public.taches_ppa(resident_id);
alter table public.taches_ppa enable row level security;
drop policy if exists sel_taches_ppa on public.taches_ppa;
drop policy if exists ins_taches_ppa on public.taches_ppa;
drop policy if exists upd_taches_ppa on public.taches_ppa;
drop policy if exists del_taches_ppa on public.taches_ppa;
create policy sel_taches_ppa on public.taches_ppa for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_taches_ppa on public.taches_ppa for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_taches_ppa on public.taches_ppa for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_taches_ppa on public.taches_ppa for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── 2. COCHES du jour (une ligne par tâche et par date) ──
create table if not exists public.taches_coches (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  tache_id         uuid not null references public.taches_ppa(id) on delete cascade,
  date             date not null,
  statut           text not null default 'fait',   -- fait / reporte
  motif            text default '',                 -- si reporté (« N'a pas voulu (c'est son droit) »…)
  soutien          text default '',                 -- niveau de soutien réellement apporté
  par              text default '',                 -- prénom/nom du professionnel (traçabilité, PAS statistique)
  par_id           text default '',
  done_at          timestamptz default now(),
  unique (tache_id, date)
);
create index if not exists taches_coches_etab_idx on public.taches_coches(etablissement_id);
create index if not exists taches_coches_date_idx on public.taches_coches(date);
alter table public.taches_coches enable row level security;
drop policy if exists sel_taches_coches on public.taches_coches;
drop policy if exists ins_taches_coches on public.taches_coches;
drop policy if exists upd_taches_coches on public.taches_coches;
drop policy if exists del_taches_coches on public.taches_coches;
create policy sel_taches_coches on public.taches_coches for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_taches_coches on public.taches_coches for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_taches_coches on public.taches_coches for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_taches_coches on public.taches_coches for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── Vérification (doit renvoyer 2 lignes) ──
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('taches_ppa', 'taches_coches');
