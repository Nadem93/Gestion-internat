-- ══════════════════════════════════════════════════════════════════════════
-- Complément de fiche de liaison hospitalière (page Fiche de liaison)
--
-- À exécuter UNE FOIS dans l'éditeur SQL de Supabase. Idempotent.
--
-- Apporté par la maquette « Fiche de liaison hosp (dossiers) » : les blocs
-- « Allergies & risques » (risque de chute), « Autonomie » (déplacement,
-- toilette, repas, communication) et « À savoir » (langue parlée, consignes
-- de transmission à l'hôpital) n'avaient AUCUNE source en base — ni sur la
-- table residents, ni sur plan_soins, ni sur evaluations.
--
-- Une seule ligne par résident : la fiche de liaison est un état courant,
-- pas un historique (l'historique clinique, lui, vit dans evaluations et
-- transmissions).
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.fiches_liaison (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  resident_id      text not null,
  risque_chute     text not null default '',   -- faible | modere | eleve | '' (non évalué)
  aut_deplacement  text not null default '',   -- autonome | aide_partielle | aide_totale | ''
  aut_toilette     text not null default '',
  aut_repas        text not null default '',
  aut_communication text not null default '',  -- bonne | partielle | difficile | non_verbale | ''
  langue           text not null default '',
  consignes        text not null default '',
  updated_by       text,                       -- auth.uid() du dernier rédacteur
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Un seul complément par résident : c'est cette contrainte que vise l'upsert
-- du client (on_conflict resident_id).
create unique index if not exists fiches_liaison_resident_uidx
  on public.fiches_liaison (resident_id);
create index if not exists fiches_liaison_etab_idx
  on public.fiches_liaison (etablissement_id);

alter table public.fiches_liaison enable row level security;

-- Lecture : tout le personnel de l'établissement. La fiche de liaison est
-- justement le document que n'importe quel professionnel doit pouvoir sortir
-- en urgence, y compris la nuit ou le week-end.
drop policy if exists fiches_liaison_select on public.fiches_liaison;
create policy fiches_liaison_select on public.fiches_liaison
  for select to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = fiches_liaison.etablissement_id));

-- Création : tout compte authentifié rattaché à l'établissement.
drop policy if exists fiches_liaison_insert on public.fiches_liaison;
create policy fiches_liaison_insert on public.fiches_liaison
  for insert to authenticated with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = fiches_liaison.etablissement_id));

-- Mise à jour : tout le personnel de l'établissement, y compris sur la ligne
-- saisie par un collègue. Le niveau d'autonomie et les consignes évoluent au
-- fil des relèves : le verrouiller sur l'auteur figerait une fiche périmée.
drop policy if exists fiches_liaison_update on public.fiches_liaison;
create policy fiches_liaison_update on public.fiches_liaison
  for update to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = fiches_liaison.etablissement_id));

-- Suppression : réservée aux administrateurs (remise à zéro d'une fiche).
drop policy if exists fiches_liaison_delete on public.fiches_liaison;
create policy fiches_liaison_delete on public.fiches_liaison
  for delete to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = fiches_liaison.etablissement_id
        and p.role in ('admin','superadmin')));

comment on table public.fiches_liaison is
  'Complément de la fiche de liaison hospitalière : risque de chute, autonomie, langue et consignes. Une ligne par résident, lisible et modifiable par tout le personnel de l''établissement.';
