-- ══════════════════════════════════════════════════════════════════════════
-- Pièces requises du dossier résident (page « Dossiers & suivi »)
--
-- À exécuter UNE FOIS dans l'éditeur SQL de Supabase. Idempotent :
-- ré-exécutable sans risque (create if not exists + drop policy if exists).
--
-- Apporté par la maquette « Dossiers & suivi - refonte (bento) », bloc
-- « Complétude des dossiers » : la maquette affiche un pourcentage de
-- complétude par résident et la liste des pièces manquantes. Rien en base
-- ne disait jusqu'ici QUELLES pièces composent un dossier complet — seuls
-- les documents déposés (public.documents_resident) étaient stockés.
--
-- Une ligne = une pièce attendue dans le dossier de chaque résident
-- (référentiel de l'établissement, saisi par la direction). La page
-- considère la pièce fournie lorsque le résident possède un document dont
-- la catégorie correspond à `categorie`, ou dont le nom contient l'un des
-- `mots_cles`. Aucun pourcentage n'est stocké : il est recalculé à
-- l'affichage à partir des documents réellement déposés.
--
-- Droits retenus (même règle que les consignes et les créneaux) :
--   · lecture                       : tout le personnel de l'établissement ;
--   · création / modification /
--     suppression du référentiel    : administrateurs uniquement — c'est un
--     paramétrage d'établissement, pas une donnée du quotidien.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.dossier_pieces_requises (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  libelle          text not null,
  categorie        text not null default '',   -- catégorie de documents_resident
  mots_cles        text[] not null default '{}',
  ordre            integer not null default 0,
  actif            boolean not null default true,
  created_by       text,                        -- auth.uid() de l'auteur
  created_at       timestamptz not null default now()
);

create index if not exists dossier_pieces_requises_etab_idx
  on public.dossier_pieces_requises (etablissement_id, actif, ordre);

alter table public.dossier_pieces_requises enable row level security;

-- Lecture : tout compte authentifié rattaché au même établissement.
drop policy if exists dossier_pieces_requises_select on public.dossier_pieces_requises;
create policy dossier_pieces_requises_select on public.dossier_pieces_requises
  for select to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = dossier_pieces_requises.etablissement_id));

-- Création : administrateurs de l'établissement.
drop policy if exists dossier_pieces_requises_insert on public.dossier_pieces_requises;
create policy dossier_pieces_requises_insert on public.dossier_pieces_requises
  for insert to authenticated with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = dossier_pieces_requises.etablissement_id
        and p.role in ('admin','superadmin')));

-- Modification : administrateurs de l'établissement.
drop policy if exists dossier_pieces_requises_update on public.dossier_pieces_requises;
create policy dossier_pieces_requises_update on public.dossier_pieces_requises
  for update to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = dossier_pieces_requises.etablissement_id
        and p.role in ('admin','superadmin')));

-- Suppression : administrateurs de l'établissement.
drop policy if exists dossier_pieces_requises_delete on public.dossier_pieces_requises;
create policy dossier_pieces_requises_delete on public.dossier_pieces_requises
  for delete to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = dossier_pieces_requises.etablissement_id
        and p.role in ('admin','superadmin')));

comment on table public.dossier_pieces_requises is
  'Référentiel des pièces attendues au dossier de chaque résident. Sert au bloc « Complétude des dossiers » de la page Dossiers & suivi : la complétude est recalculée à l''affichage à partir de public.documents_resident, jamais stockée.';
