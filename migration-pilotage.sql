-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Portail · droits annuels de congés (rh_droits_conges)
--
-- La maquette « Portail - refonte (bento) » affiche des compteurs personnels
-- exprimés en solde : « Congés restants 18 j sur 25 », « Congés payés
-- 18 / 25 j », « RTT 4 / 10 j ». Les jours PRIS sont déjà calculables (table
-- conges), mais le DROIT annuel de chaque salarié n'existait nulle part en
-- base. Cette table le porte, par salarié et par année.
--
-- Dégradation douce : tant que ce script n'a pas été exécuté, la page reste
-- pleinement utilisable — la lecture renvoie [] avec un console.warn, les
-- compteurs n'affichent que les jours pris (aucun solde inventé) et seule
-- l'écriture est refusée, avec un toast citant ce fichier.
--
-- Script IDEMPOTENT : réexécutable sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Aucune donnée n'est semée.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Table ───────────────────────────────────────────────────────────────
create table if not exists public.rh_droits_conges (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  employe_id       uuid        not null,
  annee            smallint    not null,
  jours_cp         numeric     not null default 0,
  jours_rtt        numeric     not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Colonnes ajoutées après coup (rejeu sur une base déjà créée)
alter table public.rh_droits_conges add column if not exists jours_rtt numeric not null default 0;
alter table public.rh_droits_conges add column if not exists updated_at timestamptz not null default now();

-- Bornes de bon sens : pas de droit négatif, année plausible
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rh_droits_conges_jours_chk'
      and conrelid = 'public.rh_droits_conges'::regclass
  ) then
    alter table public.rh_droits_conges
      add constraint rh_droits_conges_jours_chk
      check (jours_cp >= 0 and jours_rtt >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'rh_droits_conges_annee_chk'
      and conrelid = 'public.rh_droits_conges'::regclass
  ) then
    alter table public.rh_droits_conges
      add constraint rh_droits_conges_annee_chk
      check (annee between 2000 and 2100);
  end if;
end$$;

-- Clé étrangère vers la fiche salarié — posée seulement si les types
-- concordent, pour que le script ne casse pas si employes.id n'est pas uuid.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rh_droits_conges_employe_fk'
      and conrelid = 'public.rh_droits_conges'::regclass
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'employes'
      and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.rh_droits_conges
      add constraint rh_droits_conges_employe_fk
      foreign key (employe_id) references public.employes(id) on delete cascade;
  end if;
end$$;

-- Un seul droit par salarié et par année (support du upsert côté application)
create unique index if not exists rh_droits_conges_uniq
  on public.rh_droits_conges (employe_id, annee);
create index if not exists rh_droits_conges_etab_idx
  on public.rh_droits_conges (etablissement_id);

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table public.rh_droits_conges enable row level security;

drop policy if exists rh_droits_conges_select on public.rh_droits_conges;
drop policy if exists rh_droits_conges_insert on public.rh_droits_conges;
drop policy if exists rh_droits_conges_update on public.rh_droits_conges;
drop policy if exists rh_droits_conges_delete on public.rh_droits_conges;

-- Lecture : les membres de l'établissement (chacun lit le compteur de son
-- portail ; le service RH consolide).
create policy rh_droits_conges_select
  on public.rh_droits_conges for select
  to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

create policy rh_droits_conges_insert
  on public.rh_droits_conges for insert
  to authenticated
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

create policy rh_droits_conges_update
  on public.rh_droits_conges for update
  to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  )
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

create policy rh_droits_conges_delete
  on public.rh_droits_conges for delete
  to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- ── Horodatage de mise à jour ───────────────────────────────────────────
create or replace function public.rh_droits_conges_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists rh_droits_conges_touch_trg on public.rh_droits_conges;
create trigger rh_droits_conges_touch_trg
  before update on public.rh_droits_conges
  for each row execute function public.rh_droits_conges_touch();
