-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — « Budget & dépenses » (pilotage) — design V2
--
-- La maquette « Budget & dépenses (pilotage) » affiche deux blocs qui n'ont
-- aucune source en base aujourd'hui :
--   1. « Réalisé vs prévisionnel » : le réalisé se calcule depuis
--      budget_demandes, mais le PRÉVISIONNEL trimestriel n'existe nulle part.
--   2. « Top fournisseurs » : les demandes de budget ne portent pas de
--      fournisseur, il faut donc une table dédiée.
--
-- Ce script crée les deux tables manquantes.
--
-- Script IDEMPOTENT : peut être rejoué sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Tant qu'il ne l'est pas, la page
-- reste pleinement utilisable : la lecture renvoie [] (avec un console.warn)
-- et l'écriture est refusée avec un message nommant ce fichier.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ══════════════════════════════════════════════════════════════════════════
-- 1) PRÉVISIONNEL TRIMESTRIEL
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.budget_previsionnel (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  annee             smallint not null,
  trimestre         smallint not null,
  montant           numeric(12,2) not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.budget_previsionnel add column if not exists updated_at timestamptz not null default now();

-- Trimestre borné 1..4
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'budget_previsionnel_trimestre_chk'
      and conrelid = 'public.budget_previsionnel'::regclass
  ) then
    alter table public.budget_previsionnel
      add constraint budget_previsionnel_trimestre_chk
      check (trimestre between 1 and 4);
  end if;
end$$;

-- Une seule ligne par établissement, année et trimestre
create unique index if not exists budget_previsionnel_uniq
  on public.budget_previsionnel (etablissement_id, annee, trimestre);

alter table public.budget_previsionnel enable row level security;

drop policy if exists budget_previsionnel_select on public.budget_previsionnel;
drop policy if exists budget_previsionnel_insert on public.budget_previsionnel;
drop policy if exists budget_previsionnel_update on public.budget_previsionnel;
drop policy if exists budget_previsionnel_delete on public.budget_previsionnel;

-- Lecture : tout l'établissement
create policy budget_previsionnel_select
  on public.budget_previsionnel for select
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

-- Écriture : réservée aux administrateurs de l'établissement
create policy budget_previsionnel_insert
  on public.budget_previsionnel for insert
  to authenticated
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy budget_previsionnel_update
  on public.budget_previsionnel for update
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy budget_previsionnel_delete
  on public.budget_previsionnel for delete
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ══════════════════════════════════════════════════════════════════════════
-- 2) FOURNISSEURS (montant engagé sur l'exercice)
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.budget_fournisseurs (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  nom               text not null,
  montant           numeric(12,2) not null default 0,
  annee             smallint,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.budget_fournisseurs add column if not exists annee smallint;
alter table public.budget_fournisseurs add column if not exists updated_at timestamptz not null default now();

create index if not exists budget_fournisseurs_etab_idx
  on public.budget_fournisseurs (etablissement_id);

alter table public.budget_fournisseurs enable row level security;

drop policy if exists budget_fournisseurs_select on public.budget_fournisseurs;
drop policy if exists budget_fournisseurs_insert on public.budget_fournisseurs;
drop policy if exists budget_fournisseurs_update on public.budget_fournisseurs;
drop policy if exists budget_fournisseurs_delete on public.budget_fournisseurs;

create policy budget_fournisseurs_select
  on public.budget_fournisseurs for select
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy budget_fournisseurs_insert
  on public.budget_fournisseurs for insert
  to authenticated
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy budget_fournisseurs_update
  on public.budget_fournisseurs for update
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy budget_fournisseurs_delete
  on public.budget_fournisseurs for delete
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
