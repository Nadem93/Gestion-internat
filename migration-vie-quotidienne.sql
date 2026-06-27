-- ════════════════════════════════════════════════════════════════════
--  Migration « Vie quotidienne » → Supabase
--  Tables : repas_jour, visites, activites, nuits, med_distrib, plan_soins
--  À exécuter dans le SQL Editor de Supabase (une seule fois).
--  Convention : etablissement_id en TEXT ; RLS via public.profiles.
-- ════════════════════════════════════════════════════════════════════

-- Helper RLS appliqué à chaque table (4 policies scopées sur l'établissement)
--   etablissement_id = (select etablissement_id from public.profiles where id = auth.uid())

-- ── 1. REPAS (1 ligne par jour : inscriptions + menus) ──
create table if not exists public.repas_jour (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  date             date not null,
  data             jsonb default '{}'::jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (etablissement_id, date)
);
create index if not exists repas_jour_etab_idx on public.repas_jour(etablissement_id);
alter table public.repas_jour enable row level security;
drop policy if exists sel_repas_jour on public.repas_jour;
drop policy if exists ins_repas_jour on public.repas_jour;
drop policy if exists upd_repas_jour on public.repas_jour;
drop policy if exists del_repas_jour on public.repas_jour;
create policy sel_repas_jour on public.repas_jour for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_repas_jour on public.repas_jour for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_repas_jour on public.repas_jour for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_repas_jour on public.repas_jour for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── 2. VISITES & hébergements famille ──
create table if not exists public.visites (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  resident_id      text,
  resident_name    text default '',
  type             text default 'libre',
  personne         text default '',
  lien             text default '',
  date             date,
  heure            text default '',
  date_retour      date,
  heure_retour     text default '',
  lieu             text default '',
  notes            text default '',
  statut           text default 'prevue',
  statut_at        timestamptz,
  created_by       text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists visites_etab_idx on public.visites(etablissement_id);
alter table public.visites enable row level security;
drop policy if exists sel_visites on public.visites;
drop policy if exists ins_visites on public.visites;
drop policy if exists upd_visites on public.visites;
drop policy if exists del_visites on public.visites;
create policy sel_visites on public.visites for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_visites on public.visites for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_visites on public.visites for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_visites on public.visites for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── 3. ACTIVITÉS (catalogue) ──
create table if not exists public.activites (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  nom              text default '',
  categorie        text default 'autre',
  jour             text default '',
  heure_debut      text default '',
  heure_fin        text default '',
  lieu             text default '',
  animateur        text default '',
  places_max       integer default 0,
  description      text default '',
  actif            boolean default true,
  bilans_annuels   jsonb default '{}'::jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists activites_etab_idx on public.activites(etablissement_id);
alter table public.activites enable row level security;
drop policy if exists sel_activites on public.activites;
drop policy if exists ins_activites on public.activites;
drop policy if exists upd_activites on public.activites;
drop policy if exists del_activites on public.activites;
create policy sel_activites on public.activites for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_activites on public.activites for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_activites on public.activites for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_activites on public.activites for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── 4. CAHIER DE NUIT (1 ligne par nuit) ──
create table if not exists public.nuits (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  date             date not null,
  veilleur         text default '',
  veilleur_id      text,
  ambiance         text default 'calme',
  effectif         integer default 0,
  rondes           jsonb default '[]'::jsonb,
  evenements       jsonb default '[]'::jsonb,
  astreintes       jsonb default '[]'::jsonb,
  transmission     text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (etablissement_id, date)
);
create index if not exists nuits_etab_idx on public.nuits(etablissement_id);
alter table public.nuits enable row level security;
drop policy if exists sel_nuits on public.nuits;
drop policy if exists ins_nuits on public.nuits;
drop policy if exists upd_nuits on public.nuits;
drop policy if exists del_nuits on public.nuits;
create policy sel_nuits on public.nuits for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_nuits on public.nuits for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_nuits on public.nuits for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_nuits on public.nuits for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── 5. DISTRIBUTION MÉDICAMENTS (traçabilité des prises) ──
create table if not exists public.med_distrib (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  date             date,
  resident_id      text,
  resident_name    text default '',
  traitement_id    text,
  medicament       text default '',
  posologie        text default '',
  moment           text default '',
  statut           text default '',
  heure            text default '',
  auteur           text default '',
  observation      text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists med_distrib_etab_idx on public.med_distrib(etablissement_id);
create index if not exists med_distrib_date_idx on public.med_distrib(etablissement_id, date);
alter table public.med_distrib enable row level security;
drop policy if exists sel_med_distrib on public.med_distrib;
drop policy if exists ins_med_distrib on public.med_distrib;
drop policy if exists upd_med_distrib on public.med_distrib;
drop policy if exists del_med_distrib on public.med_distrib;
create policy sel_med_distrib on public.med_distrib for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_med_distrib on public.med_distrib for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_med_distrib on public.med_distrib for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_med_distrib on public.med_distrib for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── 6. PLAN DE SOINS ──
create table if not exists public.plan_soins (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  resident_id      text,
  cat              text default 'autre',
  freq             text default 'quotidien',
  libelle          text default '',
  detail           text default '',
  intervenant      text default '',
  note             text default '',
  actif            boolean default true,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists plan_soins_etab_idx on public.plan_soins(etablissement_id);
alter table public.plan_soins enable row level security;
drop policy if exists sel_plan_soins on public.plan_soins;
drop policy if exists ins_plan_soins on public.plan_soins;
drop policy if exists upd_plan_soins on public.plan_soins;
drop policy if exists del_plan_soins on public.plan_soins;
create policy sel_plan_soins on public.plan_soins for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_plan_soins on public.plan_soins for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_plan_soins on public.plan_soins for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_plan_soins on public.plan_soins for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
