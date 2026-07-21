-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — « Finance » (pilotage) — design V2
--
-- La maquette « Finance (pilotage) » affiche une ligne « Recettes (prix de
-- journée) » dans la comparaison année sur année, ainsi qu'une opération de
-- type « Recette » dans le tableau des dernières opérations. Aucune table de
-- l'application ne porte aujourd'hui les PRODUITS de l'établissement : les
-- budget_demandes ne décrivent que des dépenses, les fiches_paie que des
-- charges de personnel.
--
-- Ce script crée la table manquante public.finance_recettes.
--
-- Les autres lignes de la maquette sont, elles, calculées depuis l'existant :
--   • dépenses de fonctionnement → budget_demandes (statut accepté/justifié)
--   • masse salariale            → fiches_paie
--   • coût des remplacements     → fiches_paie des salariés dont le contrat
--                                  est de type « vacation » (table contrats)
--
-- Script IDEMPOTENT : peut être rejoué sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Tant qu'il ne l'est pas, la page
-- reste pleinement utilisable : la lecture renvoie [] (avec un console.warn)
-- et l'écriture est refusée avec un message nommant ce fichier.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ══════════════════════════════════════════════════════════════════════════
-- RECETTES DE L'EXERCICE
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.finance_recettes (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  annee             smallint not null,
  libelle           text not null,
  montant           numeric(14,2) not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.finance_recettes add column if not exists updated_at timestamptz not null default now();

-- Exercice plausible
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_recettes_annee_chk'
      and conrelid = 'public.finance_recettes'::regclass
  ) then
    alter table public.finance_recettes
      add constraint finance_recettes_annee_chk
      check (annee between 2000 and 2100);
  end if;
end$$;

create index if not exists finance_recettes_etab_annee_idx
  on public.finance_recettes (etablissement_id, annee);

alter table public.finance_recettes enable row level security;

drop policy if exists finance_recettes_select on public.finance_recettes;
drop policy if exists finance_recettes_insert on public.finance_recettes;
drop policy if exists finance_recettes_update on public.finance_recettes;
drop policy if exists finance_recettes_delete on public.finance_recettes;

-- Lecture : tout l'établissement
create policy finance_recettes_select
  on public.finance_recettes for select
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

-- Écriture : réservée aux administrateurs de l'établissement
create policy finance_recettes_insert
  on public.finance_recettes for insert
  to authenticated
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy finance_recettes_update
  on public.finance_recettes for update
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy finance_recettes_delete
  on public.finance_recettes for delete
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
