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
