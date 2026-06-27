-- ════════════════════════════════════════════════════════════════════
--  MIGRATION COMPLÈTE — gestion-internat → Supabase
--  Exécuter ce fichier en une seule fois dans le SQL Editor de Supabase.
--  Ordre respecté : CVS après echeances (dossiers) + satisfaction (pilotage).
--  Idempotent : ré-exécutable sans risque.
-- ════════════════════════════════════════════════════════════════════



-- ▼▼▼ migration-vie-quotidienne.sql ▼▼▼

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


-- ▼▼▼ migration-dossiers.sql ▼▼▼

-- ════════════════════════════════════════════════════════════════════
--  Migration « Dossiers & suivi » → Supabase
--  À exécuter dans le SQL Editor de Supabase.
--  Convention : etablissement_id en TEXT ; RLS via public.profiles.
--  (Ce fichier sera complété au fur et à mesure de la migration du cluster.)
-- ════════════════════════════════════════════════════════════════════

-- ── AVENANTS / PPE ──
create table if not exists public.ppe (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  resident_id      text,
  resident_name    text default '',
  date_redaction   date,
  date_revision    date,
  referent         text default '',
  protection       text default '',
  employeur        text default '',
  atelier          text default '',
  entree_esat      date,
  statut           text default 'brouillon',
  sections         jsonb default '{}'::jsonb,
  conclusion       text default '',
  signatures       jsonb default '{}'::jsonb,
  serafin          jsonb default '{}'::jsonb,
  created_by       text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists ppe_etab_idx on public.ppe(etablissement_id);
alter table public.ppe enable row level security;
drop policy if exists sel_ppe on public.ppe;
drop policy if exists ins_ppe on public.ppe;
drop policy if exists upd_ppe on public.ppe;
drop policy if exists del_ppe on public.ppe;
create policy sel_ppe on public.ppe for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_ppe on public.ppe for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_ppe on public.ppe for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_ppe on public.ppe for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── DEMANDES D'ADMISSION ──
create table if not exists public.admissions (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  prenom           text default '',
  nom              text default '',
  date_naissance   date,
  date_demande     date,
  date_entree      date,
  date_decision    date,
  dossier          text default '',
  origine          text default '',
  statut           text default 'en_attente',
  contact_nom      text default '',
  contact_tel      text default '',
  notes            text default '',
  resident_id      text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists admissions_etab_idx on public.admissions(etablissement_id);
alter table public.admissions enable row level security;
drop policy if exists sel_admissions on public.admissions;
drop policy if exists ins_admissions on public.admissions;
drop policy if exists upd_admissions on public.admissions;
drop policy if exists del_admissions on public.admissions;
create policy sel_admissions on public.admissions for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_admissions on public.admissions for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_admissions on public.admissions for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_admissions on public.admissions for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── ÉCHÉANCIER ──
create table if not exists public.echeances (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  type             text default 'autre',
  libelle          text default '',
  date             date,
  resident_id      text,
  resident_name    text default '',
  notes            text default '',
  done             boolean default false,
  done_at          timestamptz,
  author           text default '',
  source_id        text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists echeances_etab_idx on public.echeances(etablissement_id);
create index if not exists echeances_source_idx on public.echeances(source_id);
alter table public.echeances enable row level security;
drop policy if exists sel_echeances on public.echeances;
drop policy if exists ins_echeances on public.echeances;
drop policy if exists upd_echeances on public.echeances;
drop policy if exists del_echeances on public.echeances;
create policy sel_echeances on public.echeances for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_echeances on public.echeances for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_echeances on public.echeances for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_echeances on public.echeances for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── ÉVALUATIONS (MIF / Barthel) ──
create table if not exists public.evaluations (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  resident_id      text,
  grille           text default 'mif',
  date             date,
  note             text default '',
  scores           jsonb default '{}'::jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists evaluations_etab_idx on public.evaluations(etablissement_id);
alter table public.evaluations enable row level security;
drop policy if exists sel_evaluations on public.evaluations;
drop policy if exists ins_evaluations on public.evaluations;
drop policy if exists upd_evaluations on public.evaluations;
drop policy if exists del_evaluations on public.evaluations;
create policy sel_evaluations on public.evaluations for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_evaluations on public.evaluations for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_evaluations on public.evaluations for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_evaluations on public.evaluations for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── RÉPERTOIRE (contacts partenaires) ──
create table if not exists public.repertoire (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  organisme        text default '',
  nom              text default '',
  tel              text default '',
  email            text default '',
  fonction         text default '',
  adresse          text default '',
  notes            text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists repertoire_etab_idx on public.repertoire(etablissement_id);
alter table public.repertoire enable row level security;
drop policy if exists sel_repertoire on public.repertoire;
drop policy if exists ins_repertoire on public.repertoire;
drop policy if exists upd_repertoire on public.repertoire;
drop policy if exists del_repertoire on public.repertoire;
create policy sel_repertoire on public.repertoire for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_repertoire on public.repertoire for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_repertoire on public.repertoire for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_repertoire on public.repertoire for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── CONTACTS EXTERNES (vacataires, intervenants…) ──
create table if not exists public.contacts_externes (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  prenom           text default '',
  nom              text default '',
  type             text default 'autre',
  fonction         text default '',
  telephone        text default '',
  email            text default '',
  notes            text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists contacts_externes_etab_idx on public.contacts_externes(etablissement_id);
alter table public.contacts_externes enable row level security;
drop policy if exists sel_contacts_externes on public.contacts_externes;
drop policy if exists ins_contacts_externes on public.contacts_externes;
drop policy if exists upd_contacts_externes on public.contacts_externes;
drop policy if exists del_contacts_externes on public.contacts_externes;
create policy sel_contacts_externes on public.contacts_externes for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_contacts_externes on public.contacts_externes for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_contacts_externes on public.contacts_externes for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_contacts_externes on public.contacts_externes for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));


-- ▼▼▼ migration-pilotage.sql ▼▼▼

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


-- ▼▼▼ migration-cvs.sql ▼▼▼

-- ════════════════════════════════════════════════════════════════════
--  Migration « CVS » (Conseil de la Vie Sociale) → Supabase
--  À exécuter APRÈS migration-dossiers.sql (table echeances) et
--  migration-pilotage.sql (table satisfaction), dont le CVS dépend.
--  Tout le CVS (membres + séances + thématiques) tient dans un objet jsonb
--  par établissement.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.cvs (
  etablissement_id text primary key,
  data             jsonb default '{}'::jsonb,
  updated_at       timestamptz default now()
);
alter table public.cvs enable row level security;
drop policy if exists sel_cvs on public.cvs;
drop policy if exists ins_cvs on public.cvs;
drop policy if exists upd_cvs on public.cvs;
drop policy if exists del_cvs on public.cvs;
create policy sel_cvs on public.cvs for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_cvs on public.cvs for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_cvs on public.cvs for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_cvs on public.cvs for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));


-- ▼▼▼ migration-documents.sql ▼▼▼

-- ════════════════════════════════════════════════════════════════════
--  Migration « Documents des résidents » → Supabase
--  Fichiers stockés dans le bucket Storage "justificatifs".
--  resident_id = '_resources' pour les documents-ressources (non liés à un résident).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.documents_resident (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  resident_id      text,
  name             text default '',
  file_name        text default '',
  size             integer default 0,
  mime_type        text default '',
  category         text default '',
  doc_date         date,
  due_date         date,
  fichier_path     text,
  type             text default 'resident',
  uploaded_by      text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists documents_resident_etab_idx on public.documents_resident(etablissement_id);
create index if not exists documents_resident_res_idx on public.documents_resident(resident_id);
alter table public.documents_resident enable row level security;
drop policy if exists sel_documents_resident on public.documents_resident;
drop policy if exists ins_documents_resident on public.documents_resident;
drop policy if exists upd_documents_resident on public.documents_resident;
drop policy if exists del_documents_resident on public.documents_resident;
create policy sel_documents_resident on public.documents_resident for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_documents_resident on public.documents_resident for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_documents_resident on public.documents_resident for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_documents_resident on public.documents_resident for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));


-- ▼▼▼ migration-messages.sql ▼▼▼

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
