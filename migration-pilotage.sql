-- ════════════════════════════════════════════════════════════════════
--  Migration « Pilotage » → Supabase
--  Tables : inventaire, rapport_contributions, satisfaction,
--           satisfaction_questions, documentation, viatrajectoire
--  À exécuter dans le SQL Editor de Supabase.
--  Convention : etablissement_id en TEXT ; RLS via public.profiles.
-- ════════════════════════════════════════════════════════════════════

-- ── INVENTAIRE & MATÉRIEL ──
create table if not exists public.inventaire (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  cat              text default 'autre',
  nom              text default '',
  ref              text default '',
  quantite         integer default 1,
  etat             text default 'bon',
  lieu             text default '',
  date_achat       date,
  date_maintenance date,
  notes            text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists inventaire_etab_idx on public.inventaire(etablissement_id);
alter table public.inventaire enable row level security;
drop policy if exists sel_inventaire on public.inventaire;
drop policy if exists ins_inventaire on public.inventaire;
drop policy if exists upd_inventaire on public.inventaire;
drop policy if exists del_inventaire on public.inventaire;
create policy sel_inventaire on public.inventaire for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_inventaire on public.inventaire for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_inventaire on public.inventaire for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_inventaire on public.inventaire for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── CONTRIBUTIONS AU RAPPORT D'ACTIVITÉ ──
create table if not exists public.rapport_contributions (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  categorie        text default 'fait_marquant',
  mois             text default '',
  texte            text default '',
  auteur           text default '',
  author_id        text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists rapport_contributions_etab_idx on public.rapport_contributions(etablissement_id);
alter table public.rapport_contributions enable row level security;
drop policy if exists sel_rapport_contributions on public.rapport_contributions;
drop policy if exists ins_rapport_contributions on public.rapport_contributions;
drop policy if exists upd_rapport_contributions on public.rapport_contributions;
drop policy if exists del_rapport_contributions on public.rapport_contributions;
create policy sel_rapport_contributions on public.rapport_contributions for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_rapport_contributions on public.rapport_contributions for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_rapport_contributions on public.rapport_contributions for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_rapport_contributions on public.rapport_contributions for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── SATISFACTION (questionnaires) ──
create table if not exists public.satisfaction (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  repondant        text default '',
  lien_resident    text default '',
  resident_id      text,
  date             date,
  commentaire      text default '',
  reponses         jsonb default '{}'::jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists satisfaction_etab_idx on public.satisfaction(etablissement_id);
alter table public.satisfaction enable row level security;
drop policy if exists sel_satisfaction on public.satisfaction;
drop policy if exists ins_satisfaction on public.satisfaction;
drop policy if exists upd_satisfaction on public.satisfaction;
drop policy if exists del_satisfaction on public.satisfaction;
create policy sel_satisfaction on public.satisfaction for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_satisfaction on public.satisfaction for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_satisfaction on public.satisfaction for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_satisfaction on public.satisfaction for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── SATISFACTION (questions personnalisées) ──
create table if not exists public.satisfaction_questions (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  label            text default '',
  cat              text default 'Autre',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists satisfaction_questions_etab_idx on public.satisfaction_questions(etablissement_id);
alter table public.satisfaction_questions enable row level security;
drop policy if exists sel_satisfaction_questions on public.satisfaction_questions;
drop policy if exists ins_satisfaction_questions on public.satisfaction_questions;
drop policy if exists upd_satisfaction_questions on public.satisfaction_questions;
drop policy if exists del_satisfaction_questions on public.satisfaction_questions;
create policy sel_satisfaction_questions on public.satisfaction_questions for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_satisfaction_questions on public.satisfaction_questions for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_satisfaction_questions on public.satisfaction_questions for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_satisfaction_questions on public.satisfaction_questions for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── DOCUMENTATION DE L'ÉTABLISSEMENT (fichiers dans le bucket justificatifs) ──
create table if not exists public.documentation (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  titre            text default '',
  categorie        text default 'Autre',
  fichier_nom      text default '',
  fichier_mime     text default '',
  fichier_taille   integer default 0,
  fichier_path     text,
  ajoute_par       text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists documentation_etab_idx on public.documentation(etablissement_id);
alter table public.documentation enable row level security;
drop policy if exists sel_documentation on public.documentation;
drop policy if exists ins_documentation on public.documentation;
drop policy if exists upd_documentation on public.documentation;
drop policy if exists del_documentation on public.documentation;
create policy sel_documentation on public.documentation for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_documentation on public.documentation for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_documentation on public.documentation for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_documentation on public.documentation for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── DEMANDES VIATRAJECTOIRE ──
create table if not exists public.viatrajectoire (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  resident_id      text,
  type             text default 'orientation',
  mdph             text default '',
  date             date,
  statut           text default 'brouillon',
  commentaire      text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists viatrajectoire_etab_idx on public.viatrajectoire(etablissement_id);
alter table public.viatrajectoire enable row level security;
drop policy if exists sel_viatrajectoire on public.viatrajectoire;
drop policy if exists ins_viatrajectoire on public.viatrajectoire;
drop policy if exists upd_viatrajectoire on public.viatrajectoire;
drop policy if exists del_viatrajectoire on public.viatrajectoire;
create policy sel_viatrajectoire on public.viatrajectoire for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_viatrajectoire on public.viatrajectoire for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_viatrajectoire on public.viatrajectoire for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_viatrajectoire on public.viatrajectoire for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
