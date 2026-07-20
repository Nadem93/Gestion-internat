-- ══════════════════════════════════════════════════════════════════════════
-- Nature des moments de la tournée (page « Journée — Ma tournée »)
--
-- À exécuter dans l'éditeur SQL de Supabase. Idempotent : ré-exécutable
-- sans risque (create if not exists + drop policy if exists).
--
-- POURQUOI CETTE TABLE
-- La maquette V2 « Ma tournée » range chaque moment de la journée par
-- NATURE : soin, repas, activité, transmission, accompagnement, rendez-vous
-- extérieur. Cette nature pilote la couleur, l'icône, la puce de filtre et le
-- bloc « Répartition » du rail de droite. Or `public.taches_ppa` ne porte
-- aucune colonne de ce genre : la donnée n'existait pas.
--
-- Elle est stockée à côté, dans une table satellite (une ligne par tâche),
-- plutôt qu'en colonne de `taches_ppa` : la couche d'accès aux tâches
-- (js/taches-supabase.js) est partagée avec d'autres écrans et n'est pas
-- modifiée par cette migration. Tant que ce fichier n'est pas exécuté, la
-- page fonctionne : la lecture renvoie une liste vide (console.warn) et les
-- moments s'affichent simplement sans nature — rien n'est inventé.
--
-- Droits retenus :
--   · lecture      : tout le personnel de l'établissement ;
--   · qualification (insert/update) : tout le personnel de l'établissement —
--     la nature d'un moment est un fait partagé, pas une donnée personnelle :
--     un collègue doit pouvoir corriger une nature erronée ;
--   · suppression  : l'auteur de la qualification, ou un administrateur.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.taches_type (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  tache_id         uuid not null,
  type             text not null,
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Une seule nature par tâche : c'est la cible du upsert (onConflict tache_id).
create unique index if not exists taches_type_tache_idx
  on public.taches_type (tache_id);
create index if not exists taches_type_etab_idx
  on public.taches_type (etablissement_id);

-- Vocabulaire fermé : les six natures dessinées dans la maquette.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'taches_type_type_chk') then
    alter table public.taches_type
      add constraint taches_type_type_chk
      check (type in ('soin','repas','activite','transmission','accompagnement','rdv'));
  end if;
end $$;

-- Lien vers la tâche. Posé dans un bloc gardé : la contrainte n'est ajoutée
-- que si public.taches_ppa.id est bien un uuid, pour que la migration reste
-- rejouable quel que soit l'état du schéma.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'taches_type_tache_id_fkey'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'taches_ppa'
      and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.taches_type
      add constraint taches_type_tache_id_fkey
      foreign key (tache_id) references public.taches_ppa(id) on delete cascade;
  end if;
end $$;

alter table public.taches_type enable row level security;

-- Lecture : tout compte authentifié rattaché au même établissement.
drop policy if exists taches_type_select on public.taches_type;
create policy taches_type_select on public.taches_type
  for select to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = taches_type.etablissement_id));

-- Qualification : tout compte authentifié rattaché à l'établissement.
drop policy if exists taches_type_insert on public.taches_type;
create policy taches_type_insert on public.taches_type
  for insert to authenticated with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = taches_type.etablissement_id));

-- Correction : tout compte authentifié rattaché à l'établissement.
drop policy if exists taches_type_update on public.taches_type;
create policy taches_type_update on public.taches_type
  for update to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = taches_type.etablissement_id));

-- Retrait de la nature : l'auteur de la qualification, ou un administrateur.
drop policy if exists taches_type_delete on public.taches_type;
create policy taches_type_delete on public.taches_type
  for delete to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = taches_type.etablissement_id
        and (taches_type.created_by = auth.uid()::text
             or p.role in ('admin','superadmin'))));

comment on table public.taches_type is
  'Nature du moment (soin, repas, activité, transmission, accompagnement, RDV extérieur) pour chaque tâche de public.taches_ppa. Alimente les couleurs, les filtres et la répartition de la page « Journée — Ma tournée ».';
