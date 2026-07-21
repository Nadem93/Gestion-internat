-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Pointage & temps de travail (design V2)
--
-- La maquette « Pointage (RH) » affiche deux informations qui n'avaient aucune
-- source en base :
--   1. les BORNES DE POINTAGE de l'établissement (badgeuse d'entrée, borne de
--      l'unité de nuit, pointage mobile…) ;
--   2. le VERROUILLAGE MENSUEL des feuilles de temps (« Verrouiller le mois »),
--      qui fige la saisie une fois la paie transmise.
--
-- Tout le reste de la page (pointages du jour, anomalies, compteur d'heures,
-- annualisation, récupération, temps de repos, validation) est CALCULÉ à partir
-- des tables existantes : pointages, employes, contrats, absences_at,
-- planning_equipe. Aucune valeur n'est inventée.
--
-- Dégradation douce : si ces deux tables n'existent pas, js/pointage-v2.js
-- lit [] avec un console.warn, affiche un bloc « exécutez migration-pointage.sql »
-- et refuse les écritures par un toast citant ce fichier. La page reste
-- entièrement utilisable pour la saisie et le suivi des heures.
--
-- Script IDEMPOTENT : réexécutable sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Aucune donnée n'est semée.
-- ══════════════════════════════════════════════════════════════════════════

-- ══ 1. BORNES DE POINTAGE ════════════════════════════════════════════════
create table if not exists public.pointage_bornes (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  nom              text        not null,
  emplacement      text,
  type             text        not null default 'badge',   -- badge | qr | mobile
  actif            boolean     not null default true,
  commentaire      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists pointage_bornes_etab_idx
  on public.pointage_bornes (etablissement_id);

alter table public.pointage_bornes enable row level security;

drop policy if exists pointage_bornes_select on public.pointage_bornes;
create policy pointage_bornes_select
  on public.pointage_bornes for select
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists pointage_bornes_insert on public.pointage_bornes;
create policy pointage_bornes_insert
  on public.pointage_bornes for insert
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists pointage_bornes_update on public.pointage_bornes;
create policy pointage_bornes_update
  on public.pointage_bornes for update
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

drop policy if exists pointage_bornes_delete on public.pointage_bornes;
create policy pointage_bornes_delete
  on public.pointage_bornes for delete
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );


-- ══ 2. VERROUILLAGE MENSUEL DES FEUILLES DE TEMPS ════════════════════════
create table if not exists public.pointage_verrous_mois (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  mois             text        not null,          -- 'AAAA-MM'
  verrouille       boolean     not null default false,
  verrouille_par   text,
  verrouille_le    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Un seul verrou par mois et par établissement (cible de l'upsert)
create unique index if not exists pointage_verrous_mois_etab_mois_idx
  on public.pointage_verrous_mois (etablissement_id, mois);

alter table public.pointage_verrous_mois enable row level security;

drop policy if exists pointage_verrous_mois_select on public.pointage_verrous_mois;
create policy pointage_verrous_mois_select
  on public.pointage_verrous_mois for select
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists pointage_verrous_mois_insert on public.pointage_verrous_mois;
create policy pointage_verrous_mois_insert
  on public.pointage_verrous_mois for insert
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists pointage_verrous_mois_update on public.pointage_verrous_mois;
create policy pointage_verrous_mois_update
  on public.pointage_verrous_mois for update
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

drop policy if exists pointage_verrous_mois_delete on public.pointage_verrous_mois;
create policy pointage_verrous_mois_delete
  on public.pointage_verrous_mois for delete
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );


-- ══ 3. HORODATAGE ════════════════════════════════════════════════════════
create or replace function public.pointage_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists pointage_bornes_touch_trg on public.pointage_bornes;
create trigger pointage_bornes_touch_trg
  before update on public.pointage_bornes
  for each row execute function public.pointage_touch();

drop trigger if exists pointage_verrous_mois_touch_trg on public.pointage_verrous_mois;
create trigger pointage_verrous_mois_touch_trg
  before update on public.pointage_verrous_mois
  for each row execute function public.pointage_touch();
