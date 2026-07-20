-- ══════════════════════════════════════════════════════════════════════════
-- RÉPERTOIRE DES PARTENAIRES — catégorie, favori et journal des appels
--
-- Ajouts nécessaires à la page repertoire.html (design V2) :
--   1. public.repertoire.categorie  — classe le contact (médical, social,
--      juridique, éducation, technique) et pilote les filtres colorés ;
--   2. public.repertoire.favori     — épingle le contact dans le bloc
--      « Contacts favoris » ;
--   3. public.repertoire_appels     — journal des appels passés ou reçus,
--      alimenté quand on compose un numéro depuis une fiche.
--
-- À exécuter dans l'éditeur SQL de Supabase. Idempotent : ré-exécutable sans
-- risque (add column if not exists + create if not exists + drop policy if
-- exists). Tant qu'il n'est pas exécuté, la page reste utilisable : aucune
-- catégorie ni favori ne s'affiche et le journal des appels reste vide.
--
-- Droits retenus (même règle que le répertoire lui-même) :
--   · lecture      : tout le personnel de l'établissement ;
--   · création     : tout le personnel de l'établissement ;
--   · modification / suppression : l'auteur de la ligne, ou un administrateur.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1 & 2. Colonnes ajoutées au répertoire ────────────────────────────────
alter table public.repertoire
  add column if not exists categorie text,
  add column if not exists favori    boolean not null default false;

-- Valeurs autorisées pour la catégorie (null = contact non classé).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'repertoire_categorie_chk') then
    alter table public.repertoire
      add constraint repertoire_categorie_chk
      check (categorie is null or categorie in
        ('medical', 'social', 'juridique', 'education', 'technique'));
  end if;
end $$;

create index if not exists repertoire_favori_idx
  on public.repertoire (etablissement_id, favori) where favori;

comment on column public.repertoire.categorie is
  'Catégorie du partenaire : medical, social, juridique, education, technique. Null = non classé.';
comment on column public.repertoire.favori is
  'Contact épinglé dans le bloc « Contacts favoris » de la page Répertoire.';

-- ── 3. Journal des appels ─────────────────────────────────────────────────
create table if not exists public.repertoire_appels (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  contact_id       uuid not null,
  sens             text not null default 'sortant',
  appele_le        timestamptz not null default now(),
  note             text,
  created_by       text,
  created_at       timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'repertoire_appels_sens_chk') then
    alter table public.repertoire_appels
      add constraint repertoire_appels_sens_chk check (sens in ('entrant', 'sortant'));
  end if;
end $$;

-- Lien vers le contact appelé. Posé dans un bloc gardé : la contrainte n'est
-- ajoutée que si public.repertoire.id est bien un uuid, pour que la migration
-- reste rejouable quel que soit l'état du schéma.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'repertoire_appels_contact_id_fkey'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'repertoire'
      and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.repertoire_appels
      add constraint repertoire_appels_contact_id_fkey
      foreign key (contact_id) references public.repertoire(id) on delete cascade;
  end if;
end $$;

create index if not exists repertoire_appels_etab_date_idx
  on public.repertoire_appels (etablissement_id, appele_le desc);
create index if not exists repertoire_appels_contact_idx
  on public.repertoire_appels (contact_id);

alter table public.repertoire_appels enable row level security;

-- Lecture : tout compte authentifié rattaché au même établissement.
drop policy if exists repertoire_appels_select on public.repertoire_appels;
create policy repertoire_appels_select on public.repertoire_appels
  for select to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = repertoire_appels.etablissement_id));

-- Journalisation : tout compte authentifié rattaché à l'établissement.
drop policy if exists repertoire_appels_insert on public.repertoire_appels;
create policy repertoire_appels_insert on public.repertoire_appels
  for insert to authenticated with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = repertoire_appels.etablissement_id));

-- Modification : l'auteur de la ligne, ou un administrateur.
drop policy if exists repertoire_appels_update on public.repertoire_appels;
create policy repertoire_appels_update on public.repertoire_appels
  for update to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = repertoire_appels.etablissement_id
        and (repertoire_appels.created_by = auth.uid()::text
             or p.role in ('admin', 'superadmin'))));

-- Suppression : l'auteur de la ligne, ou un administrateur.
drop policy if exists repertoire_appels_delete on public.repertoire_appels;
create policy repertoire_appels_delete on public.repertoire_appels
  for delete to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = repertoire_appels.etablissement_id
        and (repertoire_appels.created_by = auth.uid()::text
             or p.role in ('admin', 'superadmin'))));

comment on table public.repertoire_appels is
  'Journal des appels du répertoire partenaires (bloc « Derniers appels »). Journalisation ouverte à tout le personnel de l''établissement ; correction ou suppression par l''auteur ou un administrateur.';
