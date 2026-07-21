-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — MIGRATION CONSOLIDÉE
--
-- Regroupe les 22 fichiers migration-*.sql produits pendant la refonte V2.
-- À exécuter EN UNE FOIS dans l'éditeur SQL de Supabase.
--
-- ENTIÈREMENT IDEMPOTENT : chaque `create table` est en `if not exists`, chaque
-- `add column` aussi, chaque `create policy` est précédé d'un `drop policy if
-- exists`, et AUCUN fichier ne contient d'INSERT. Le rejouer ne duplique donc
-- aucune donnée et n'écrase rien de ce qui a été saisi.
--
-- Les fichiers déjà exécutés individuellement peuvent rester dans ce lot : ils
-- ne feront rien la seconde fois.
--
-- Généré le 2026-07-21
-- ══════════════════════════════════════════════════════════════════════════



-- ═══════════════════════════════════════════════════════════════════
-- [01/22]  migration-absences.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Absences & accidents du travail (design V2)
--
-- La page absences.html affiche trois panneaux qui n'avaient aucune source en
-- base. Ce script crée les tables correspondantes :
--
--   1. absences_at_etapes  → « Déclaration AT » : avancement de la procédure
--                            légale (constat, certificat initial, CERFA/DAT,
--                            feuille d'accident IJSS).
--   2. absences_impact     → « Impact planning » : postes découverts par une
--                            absence et mode de couverture.
--   3. absences_couts      → « Coût des absences » : maintien de salaire, coût
--                            des remplacements, IJSS récupérées.
--
-- Dégradation douce déjà codée côté page : si une table n'existe pas, la
-- lecture renvoie [] avec un console.warn, le panneau affiche un état vide
-- citant ce fichier, l'écriture est refusée par un toast, et le reste de la
-- page (tableau, registre AT, taux d'absentéisme, Bradford…) reste utilisable.
-- Aucune valeur n'est inventée : sans ligne, la page affiche « — ».
--
-- Script IDEMPOTENT : réexécutable sans effet de bord. Aucune donnée semée.
-- À exécuter dans l'éditeur SQL Supabase.
-- ══════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════
-- 1) ÉTAPES DE LA DÉCLARATION D'ACCIDENT DU TRAVAIL
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.absences_at_etapes (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  absence_id       uuid        not null references public.absences_at (id) on delete cascade,
  code             text        not null,          -- constat | certificat | cerfa | feuille
  statut           text        not null default 'a_faire',  -- a_faire | en_cours | fait
  fait_le          date,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Une seule ligne par étape et par absence (cible du upsert de la page)
create unique index if not exists absences_at_etapes_absence_code_idx
  on public.absences_at_etapes (absence_id, code);

create index if not exists absences_at_etapes_etab_idx
  on public.absences_at_etapes (etablissement_id);

alter table public.absences_at_etapes enable row level security;

drop policy if exists absences_at_etapes_select on public.absences_at_etapes;
create policy absences_at_etapes_select
  on public.absences_at_etapes for select
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_at_etapes_insert on public.absences_at_etapes;
create policy absences_at_etapes_insert
  on public.absences_at_etapes for insert
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_at_etapes_update on public.absences_at_etapes;
create policy absences_at_etapes_update
  on public.absences_at_etapes for update
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

drop policy if exists absences_at_etapes_delete on public.absences_at_etapes;
create policy absences_at_etapes_delete
  on public.absences_at_etapes for delete
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );


-- ══════════════════════════════════════════════════════════════════════════
-- 2) IMPACT SUR LE PLANNING
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.absences_impact (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  absence_id       uuid        not null references public.absences_at (id) on delete cascade,
  poste            text        not null,          -- « Nuit — unité B », « AES — unité A »…
  couverture       text        not null default 'non_couvert', -- non_couvert | vacataire | cdd | interne
  detail           text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists absences_impact_absence_idx
  on public.absences_impact (absence_id);

create index if not exists absences_impact_etab_idx
  on public.absences_impact (etablissement_id);

alter table public.absences_impact enable row level security;

drop policy if exists absences_impact_select on public.absences_impact;
create policy absences_impact_select
  on public.absences_impact for select
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_impact_insert on public.absences_impact;
create policy absences_impact_insert
  on public.absences_impact for insert
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_impact_update on public.absences_impact;
create policy absences_impact_update
  on public.absences_impact for update
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

drop policy if exists absences_impact_delete on public.absences_impact;
create policy absences_impact_delete
  on public.absences_impact for delete
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );


-- ══════════════════════════════════════════════════════════════════════════
-- 3) COÛT DES ABSENCES
--    Données de paie : lecture réservée aux comptes de l'établissement, comme
--    partout ailleurs. absence_id est facultatif (montant global d'une année).
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.absences_couts (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  absence_id       uuid        references public.absences_at (id) on delete set null,
  annee            integer     not null,
  poste            text        not null,          -- maintien_salaire | remplacement | ijss
  montant          numeric(12,2) not null default 0,  -- IJSS récupérées : montant négatif
  commentaire      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists absences_couts_etab_annee_idx
  on public.absences_couts (etablissement_id, annee);

alter table public.absences_couts enable row level security;

drop policy if exists absences_couts_select on public.absences_couts;
create policy absences_couts_select
  on public.absences_couts for select
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_couts_insert on public.absences_couts;
create policy absences_couts_insert
  on public.absences_couts for insert
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_couts_update on public.absences_couts;
create policy absences_couts_update
  on public.absences_couts for update
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

drop policy if exists absences_couts_delete on public.absences_couts;
create policy absences_couts_delete
  on public.absences_couts for delete
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );


-- ══════════════════════════════════════════════════════════════════════════
-- Horodatage de mise à jour (une fonction, trois déclencheurs)
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.absences_v2_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists absences_at_etapes_touch_trg on public.absences_at_etapes;
create trigger absences_at_etapes_touch_trg
  before update on public.absences_at_etapes
  for each row execute function public.absences_v2_touch();

drop trigger if exists absences_impact_touch_trg on public.absences_impact;
create trigger absences_impact_touch_trg
  before update on public.absences_impact
  for each row execute function public.absences_v2_touch();

drop trigger if exists absences_couts_touch_trg on public.absences_couts;
create trigger absences_couts_touch_trg
  before update on public.absences_couts
  for each row execute function public.absences_v2_touch();


-- ═══════════════════════════════════════════════════════════════════
-- [02/22]  migration-astreintes.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Astreintes · tables complémentaires
--
-- La page astreintes.html (design V2) affiche, en plus du roulement déjà
-- stocké dans public.astreintes :
--   · le registre des interventions déclenchées pendant une astreinte
--   · le barème d'indemnités de l'établissement (CCN 66)
--   · la cascade de contacts (qui appeler, dans quel ordre)
--   · les consignes d'astreinte (fiches réflexes)
--
-- Les indemnités du mois, le repos compensateur et le nombre d'interventions
-- par semaine sont CALCULÉS à partir de ces tables : rien n'est codé en dur.
--
-- Dégradation douce : si une table est absente, la page la lit comme vide,
-- journalise un console.warn et reste pleinement utilisable ; seules les
-- écritures sont refusées, avec un toast citant ce fichier.
--
-- Script IDEMPOTENT : réexécutable sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Aucune donnée n'est semée.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1) Registre des interventions ────────────────────────────────────────
create table if not exists public.astreintes_interventions (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  astreinte_id     uuid        references public.astreintes(id) on delete set null,
  date             date        not null,
  motif            text        not null,
  cadre            text,                       -- nom du cadre intervenu
  heure_appel      time,
  heure_fin        time,
  trajet_min       integer     not null default 0,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists astreintes_interventions_etab_idx
  on public.astreintes_interventions (etablissement_id, date desc);

-- ── 2) Barème d'indemnités ───────────────────────────────────────────────
-- unite = 'jour'         → taux appliqué par jour d'astreinte du type visé
--         'intervention' → taux appliqué par intervention du mois
-- code  = semaine | weekend | ferie | intervention
create table if not exists public.astreintes_bareme (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  code             text        not null,
  label            text        not null,
  taux             numeric     not null default 0,   -- en euros
  unite            text        not null default 'jour',
  ordre            integer     not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists astreintes_bareme_etab_code_idx
  on public.astreintes_bareme (etablissement_id, code);

-- ── 3) Cascade de contacts ───────────────────────────────────────────────
create table if not exists public.astreintes_cascade (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  rang             integer     not null default 1,
  fonction         text        not null,           -- « Cadre d'astreinte »…
  nom              text,
  tel              text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists astreintes_cascade_etab_idx
  on public.astreintes_cascade (etablissement_id, rang);

-- ── 4) Consignes d'astreinte (fiches réflexes) ───────────────────────────
create table if not exists public.astreintes_consignes (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  titre            text        not null,
  contenu          text,
  couleur          text,                            -- #ef4444…
  ordre            integer     not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists astreintes_consignes_etab_idx
  on public.astreintes_consignes (etablissement_id, ordre);

-- ══ RLS — cloisonnement par établissement via public.profiles ════════════
alter table public.astreintes_interventions enable row level security;
alter table public.astreintes_bareme        enable row level security;
alter table public.astreintes_cascade       enable row level security;
alter table public.astreintes_consignes     enable row level security;

-- 1) astreintes_interventions
drop policy if exists astreintes_interventions_select on public.astreintes_interventions;
create policy astreintes_interventions_select
  on public.astreintes_interventions for select
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists astreintes_interventions_insert on public.astreintes_interventions;
create policy astreintes_interventions_insert
  on public.astreintes_interventions for insert
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists astreintes_interventions_update on public.astreintes_interventions;
create policy astreintes_interventions_update
  on public.astreintes_interventions for update
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists astreintes_interventions_delete on public.astreintes_interventions;
create policy astreintes_interventions_delete
  on public.astreintes_interventions for delete
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

-- 2) astreintes_bareme
drop policy if exists astreintes_bareme_select on public.astreintes_bareme;
create policy astreintes_bareme_select
  on public.astreintes_bareme for select
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists astreintes_bareme_insert on public.astreintes_bareme;
create policy astreintes_bareme_insert
  on public.astreintes_bareme for insert
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists astreintes_bareme_update on public.astreintes_bareme;
create policy astreintes_bareme_update
  on public.astreintes_bareme for update
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists astreintes_bareme_delete on public.astreintes_bareme;
create policy astreintes_bareme_delete
  on public.astreintes_bareme for delete
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

-- 3) astreintes_cascade
drop policy if exists astreintes_cascade_select on public.astreintes_cascade;
create policy astreintes_cascade_select
  on public.astreintes_cascade for select
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists astreintes_cascade_insert on public.astreintes_cascade;
create policy astreintes_cascade_insert
  on public.astreintes_cascade for insert
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists astreintes_cascade_update on public.astreintes_cascade;
create policy astreintes_cascade_update
  on public.astreintes_cascade for update
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists astreintes_cascade_delete on public.astreintes_cascade;
create policy astreintes_cascade_delete
  on public.astreintes_cascade for delete
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

-- 4) astreintes_consignes
drop policy if exists astreintes_consignes_select on public.astreintes_consignes;
create policy astreintes_consignes_select
  on public.astreintes_consignes for select
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists astreintes_consignes_insert on public.astreintes_consignes;
create policy astreintes_consignes_insert
  on public.astreintes_consignes for insert
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists astreintes_consignes_update on public.astreintes_consignes;
create policy astreintes_consignes_update
  on public.astreintes_consignes for update
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists astreintes_consignes_delete on public.astreintes_consignes;
create policy astreintes_consignes_delete
  on public.astreintes_consignes for delete
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

-- ── Horodatage de mise à jour ────────────────────────────────────────────
create or replace function public.astreintes_extra_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists astreintes_interventions_touch_trg on public.astreintes_interventions;
create trigger astreintes_interventions_touch_trg
  before update on public.astreintes_interventions
  for each row execute function public.astreintes_extra_touch();

drop trigger if exists astreintes_bareme_touch_trg on public.astreintes_bareme;
create trigger astreintes_bareme_touch_trg
  before update on public.astreintes_bareme
  for each row execute function public.astreintes_extra_touch();

drop trigger if exists astreintes_cascade_touch_trg on public.astreintes_cascade;
create trigger astreintes_cascade_touch_trg
  before update on public.astreintes_cascade
  for each row execute function public.astreintes_extra_touch();

drop trigger if exists astreintes_consignes_touch_trg on public.astreintes_consignes;
create trigger astreintes_consignes_touch_trg
  before update on public.astreintes_consignes
  for each row execute function public.astreintes_extra_touch();


-- ═══════════════════════════════════════════════════════════════════
-- [03/22]  migration-budget.sql
-- ═══════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════
-- [04/22]  migration-conges.sql
-- ═══════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════
-- DEMANDES DE CONGÉS (RH) — règles & quotas de service
--
-- La maquette « Demandes congés (RH) » affiche un bloc « Règles & quotas »
-- (max d'absents simultanés, effectif de nuit garanti, période de fermeture,
-- CP à écouler…) qui n'avait aucune source en base. Cette table le porte.
--
-- Elle sert aussi au calcul du drapeau « Sous-effectif » sur les demandes en
-- attente : sans la règle `max_absents_simultanes`, la page N'AFFICHE AUCUN
-- conflit plutôt que d'en inventer un.
--
-- Les compteurs individuels (CP N-1, CP N, RTT, récup, CET) et les soldes
-- d'équipe viennent de la table `conges_soldes` créée par
-- migration-mes-conges.sql — ce fichier ne la redéfinit pas.
--
-- Idempotent : exécutable plusieurs fois sans erreur.
-- À exécuter dans l'éditeur SQL Supabase. NE PAS exécuter automatiquement.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.conges_regles (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  -- Code technique lu par js/conges-v2.js :
  --   max_absents_simultanes → valeur = nb max d'absents acceptés le même jour
  --   effectif_nuit_min      → valeur = nb minimum de veilleurs
  --   cp_acquis_mois         → valeur = jours de CP acquis par mois et par salarié
  --   fermeture              → valeur_texte = période de fermeture imposée
  --   cp_limite_solde        → valeur_texte = date limite d'écoulement des CP
  code              text not null,
  libelle           text not null default '',
  detail            text not null default '',
  valeur            numeric(6,2),
  valeur_texte      text default '',
  actif             boolean not null default true,
  ordre             integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists conges_regles_uniq
  on public.conges_regles (etablissement_id, code);
create index if not exists conges_regles_actif_idx
  on public.conges_regles (etablissement_id, actif);

alter table public.conges_regles enable row level security;

-- Les quatre politiques sont filtrées par l'établissement du profil connecté.
drop policy if exists conges_regles_select on public.conges_regles;
create policy conges_regles_select on public.conges_regles
  for select to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists conges_regles_insert on public.conges_regles;
create policy conges_regles_insert on public.conges_regles
  for insert to authenticated
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists conges_regles_update on public.conges_regles;
create policy conges_regles_update on public.conges_regles
  for update to authenticated
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

drop policy if exists conges_regles_delete on public.conges_regles;
create policy conges_regles_delete on public.conges_regles
  for delete to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Tant que cette migration n'est pas exécutée, conges.html affiche le bloc
-- « Règles & quotas » vide (console.warn) et ne signale aucun sous-effectif :
-- aucune valeur n'est jamais inventée.


-- ═══════════════════════════════════════════════════════════════════
-- [05/22]  migration-contacts-externes.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Remplaçants & vacataires (contacts extérieurs) · design V2
--
-- La page contacts-externes.html reprend la maquette « Contacts extérieurs
-- (RH) » : un VIVIER de remplaçants et vacataires, avec les besoins de
-- remplacement à couvrir, les missions, les disponibilités de la semaine, la
-- conformité des pièces administratives, le coût des remplacements et les
-- évaluations post-mission.
--
-- La table public.contacts_externes existante ne portait que l'identité et
-- les coordonnées. Ce script ajoute :
--   · 4 colonnes sur contacts_externes  (metier, statut, taux_horaire, dispo)
--   · public.ce_besoins       — postes à couvrir
--   · public.ce_missions      — missions confiées + coût réel
--   · public.ce_dispos        — disponibilité jour par jour
--   · public.ce_pieces        — pièces administratives (conformité)
--   · public.ce_evaluations   — évaluation post-mission
--   · public.ce_diffusions    — diffusion d'un besoin et réponses reçues
--
-- Rien n'est calculé en dur côté page : le nombre de missions, la note
-- moyenne, le coût cumulé, le coût moyen et les suggestions de matching sont
-- dérivés de ces tables.
--
-- DÉGRADATION DOUCE : si une table ou une colonne est absente, la page la lit
-- comme vide, journalise un console.warn et reste pleinement utilisable ;
-- seules les écritures sont refusées, avec un toast citant ce fichier.
--
-- Script IDEMPOTENT : réexécutable sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Aucune donnée n'est semée.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 0) Colonnes complémentaires du vivier ────────────────────────────────
-- metier  : educ | aes | veilleur | ide | surv   (NULL = non renseigné)
-- statut  : dispo | mission | indispo            (NULL = non renseigné)
alter table public.contacts_externes add column if not exists metier       text;
alter table public.contacts_externes add column if not exists statut       text;
alter table public.contacts_externes add column if not exists taux_horaire numeric;
alter table public.contacts_externes add column if not exists dispo        text;

-- ── 1) Besoins de remplacement à couvrir ─────────────────────────────────
-- urgence : urgent | a_pourvoir | couvert
create table if not exists public.ce_besoins (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  poste            text        not null,
  metier           text,
  motif            text,
  date_debut       date,
  date_fin         date,
  urgence          text        not null default 'a_pourvoir',
  couvert_par      uuid        references public.contacts_externes(id) on delete set null,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists ce_besoins_etab_idx
  on public.ce_besoins (etablissement_id, date_debut);

-- ── 2) Missions confiées ─────────────────────────────────────────────────
-- statut : prevue | en_cours | terminee | annulee
create table if not exists public.ce_missions (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  contact_id       uuid        not null references public.contacts_externes(id) on delete cascade,
  besoin_id        uuid        references public.ce_besoins(id) on delete set null,
  poste            text,
  date_debut       date,
  date_fin         date,
  heures           numeric,
  cout             numeric,                       -- coût réel constaté, en euros
  statut           text        not null default 'prevue',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists ce_missions_etab_idx
  on public.ce_missions (etablissement_id, date_debut desc);
create index if not exists ce_missions_contact_idx
  on public.ce_missions (contact_id);

-- ── 3) Disponibilités jour par jour ──────────────────────────────────────
-- etat : dispo | mission | indispo   (absence de ligne = non renseigné)
create table if not exists public.ce_dispos (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  contact_id       uuid        not null references public.contacts_externes(id) on delete cascade,
  jour             date        not null,
  etat             text        not null default 'dispo',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists ce_dispos_contact_jour_idx
  on public.ce_dispos (contact_id, jour);
create index if not exists ce_dispos_etab_jour_idx
  on public.ce_dispos (etablissement_id, jour);

-- ── 4) Pièces administratives (conformité) ───────────────────────────────
-- piece : cv | diplome | casier | vitale | rib
-- etat  : ok | a_renouveler | manquante
create table if not exists public.ce_pieces (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  contact_id       uuid        not null references public.contacts_externes(id) on delete cascade,
  piece            text        not null,
  etat             text        not null default 'manquante',
  date_expiration  date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists ce_pieces_contact_piece_idx
  on public.ce_pieces (contact_id, piece);
create index if not exists ce_pieces_etab_idx
  on public.ce_pieces (etablissement_id);

-- ── 5) Évaluations post-mission ──────────────────────────────────────────
-- fidelisation : prioritaire | a_revoir | ecarter
create table if not exists public.ce_evaluations (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  contact_id       uuid        not null references public.contacts_externes(id) on delete cascade,
  mission_id       uuid        references public.ce_missions(id) on delete set null,
  note             numeric,                       -- appréciation sur 5
  commentaire      text,
  fidelisation     text,
  evalue_par       text,
  evalue_le        date        not null default current_date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists ce_evaluations_etab_idx
  on public.ce_evaluations (etablissement_id, evalue_le desc);
create index if not exists ce_evaluations_contact_idx
  on public.ce_evaluations (contact_id);

-- ── 6) Diffusion d'un besoin et réponses ─────────────────────────────────
-- canal   : sms | email
-- reponse : en_attente | accepte | refuse
create table if not exists public.ce_diffusions (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  besoin_id        uuid        references public.ce_besoins(id) on delete cascade,
  contact_id       uuid        not null references public.contacts_externes(id) on delete cascade,
  canal            text        not null default 'sms',
  reponse          text        not null default 'en_attente',
  diffuse_le       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists ce_diffusions_etab_idx
  on public.ce_diffusions (etablissement_id, diffuse_le desc);
create index if not exists ce_diffusions_besoin_idx
  on public.ce_diffusions (besoin_id);

-- ══ RLS — cloisonnement par établissement via public.profiles ════════════
alter table public.ce_besoins     enable row level security;
alter table public.ce_missions    enable row level security;
alter table public.ce_dispos      enable row level security;
alter table public.ce_pieces      enable row level security;
alter table public.ce_evaluations enable row level security;
alter table public.ce_diffusions  enable row level security;

-- 1) ce_besoins
drop policy if exists ce_besoins_select on public.ce_besoins;
create policy ce_besoins_select
  on public.ce_besoins for select
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_besoins_insert on public.ce_besoins;
create policy ce_besoins_insert
  on public.ce_besoins for insert
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_besoins_update on public.ce_besoins;
create policy ce_besoins_update
  on public.ce_besoins for update
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_besoins_delete on public.ce_besoins;
create policy ce_besoins_delete
  on public.ce_besoins for delete
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

-- 2) ce_missions
drop policy if exists ce_missions_select on public.ce_missions;
create policy ce_missions_select
  on public.ce_missions for select
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_missions_insert on public.ce_missions;
create policy ce_missions_insert
  on public.ce_missions for insert
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_missions_update on public.ce_missions;
create policy ce_missions_update
  on public.ce_missions for update
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_missions_delete on public.ce_missions;
create policy ce_missions_delete
  on public.ce_missions for delete
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

-- 3) ce_dispos
drop policy if exists ce_dispos_select on public.ce_dispos;
create policy ce_dispos_select
  on public.ce_dispos for select
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_dispos_insert on public.ce_dispos;
create policy ce_dispos_insert
  on public.ce_dispos for insert
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_dispos_update on public.ce_dispos;
create policy ce_dispos_update
  on public.ce_dispos for update
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_dispos_delete on public.ce_dispos;
create policy ce_dispos_delete
  on public.ce_dispos for delete
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

-- 4) ce_pieces
drop policy if exists ce_pieces_select on public.ce_pieces;
create policy ce_pieces_select
  on public.ce_pieces for select
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_pieces_insert on public.ce_pieces;
create policy ce_pieces_insert
  on public.ce_pieces for insert
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_pieces_update on public.ce_pieces;
create policy ce_pieces_update
  on public.ce_pieces for update
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_pieces_delete on public.ce_pieces;
create policy ce_pieces_delete
  on public.ce_pieces for delete
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

-- 5) ce_evaluations
drop policy if exists ce_evaluations_select on public.ce_evaluations;
create policy ce_evaluations_select
  on public.ce_evaluations for select
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_evaluations_insert on public.ce_evaluations;
create policy ce_evaluations_insert
  on public.ce_evaluations for insert
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_evaluations_update on public.ce_evaluations;
create policy ce_evaluations_update
  on public.ce_evaluations for update
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_evaluations_delete on public.ce_evaluations;
create policy ce_evaluations_delete
  on public.ce_evaluations for delete
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

-- 6) ce_diffusions
drop policy if exists ce_diffusions_select on public.ce_diffusions;
create policy ce_diffusions_select
  on public.ce_diffusions for select
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_diffusions_insert on public.ce_diffusions;
create policy ce_diffusions_insert
  on public.ce_diffusions for insert
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_diffusions_update on public.ce_diffusions;
create policy ce_diffusions_update
  on public.ce_diffusions for update
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists ce_diffusions_delete on public.ce_diffusions;
create policy ce_diffusions_delete
  on public.ce_diffusions for delete
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

-- ══ Fin ══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════
-- [06/22]  migration-contrats.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Contrats de travail (module RH)
--
-- Crée les tables des blocs dessinés dans la maquette « Contrats (RH) » qui
-- n'avaient aucune source en base :
--   · contrat_couts → coût employeur par contrat (brut + charges patronales)
--   · contrat_dpae  → DPAE URSSAF & registre unique du personnel
--
-- Tout le reste de la page (statistiques, échéances, répartition, périodes
-- d'essai, ancienneté, historique, avenants, registre) est dérivé de la table
-- `contrats` existante : aucune valeur n'est inventée.
--
-- Script IDEMPOTENT : peut être rejoué sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Tant qu'il ne l'est pas, la page
-- reste pleinement utilisable : chaque lecture renvoie [] avec un console.warn
-- et chaque écriture est refusée par un toast nommant ce fichier.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────────

-- Coût employeur mensuel d'un contrat : salaire brut + charges patronales.
-- Donnée de paie : lecture et écriture réservées à l'encadrement (voir RLS).
create table if not exists public.contrat_couts (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  contrat_id       uuid not null,
  employe_id       uuid,
  brut             numeric(12,2) not null default 0,
  charges          numeric(12,2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Déclaration préalable à l'embauche (URSSAF) et inscription au registre
-- unique du personnel — obligation Art. L1221-13 du code du travail.
create table if not exists public.contrat_dpae (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  contrat_id       uuid not null,
  employe_id       uuid,
  statut           text not null default 'a_declarer',   -- a_declarer | declaree
  declaree_le      date,
  reference        text not null default '',
  registre         boolean not null default false,       -- inscrit au registre unique
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Colonnes ajoutées après coup (rejeu sur une base déjà créée)
alter table public.contrat_couts add column if not exists employe_id uuid;
alter table public.contrat_dpae  add column if not exists employe_id uuid;
alter table public.contrat_dpae  add column if not exists reference text not null default '';
alter table public.contrat_dpae  add column if not exists registre boolean not null default false;

-- Montants positifs
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contrat_couts_pos_chk'
      and conrelid = 'public.contrat_couts'::regclass
  ) then
    alter table public.contrat_couts
      add constraint contrat_couts_pos_chk check (brut >= 0 and charges >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'contrat_dpae_statut_chk'
      and conrelid = 'public.contrat_dpae'::regclass
  ) then
    alter table public.contrat_dpae
      add constraint contrat_dpae_statut_chk check (statut in ('a_declarer', 'declaree'));
  end if;
end$$;

-- Clés étrangères — posées seulement si les types concordent, pour que le
-- script ne casse pas si contrats.id / employes.id n'étaient pas en uuid.
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('contrat_couts', 'contrat_couts_ct_fk',  'contrat_id', 'contrats'),
      ('contrat_couts', 'contrat_couts_emp_fk', 'employe_id', 'employes'),
      ('contrat_dpae',  'contrat_dpae_ct_fk',   'contrat_id', 'contrats'),
      ('contrat_dpae',  'contrat_dpae_emp_fk',  'employe_id', 'employes')
    ) as v(tbl, cname, col, ref)
  loop
    if not exists (
      select 1 from pg_constraint
      where conname = t.cname and conrelid = ('public.' || t.tbl)::regclass
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t.ref
        and column_name = 'id' and data_type = 'uuid'
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.%I(id) on delete cascade',
        t.tbl, t.cname, t.col, t.ref);
    end if;
  end loop;
end$$;

-- Unicité (un coût et une DPAE par contrat) et index
create unique index if not exists contrat_couts_uniq on public.contrat_couts (etablissement_id, contrat_id);
create unique index if not exists contrat_dpae_uniq  on public.contrat_dpae  (etablissement_id, contrat_id);
create index if not exists contrat_couts_etab_idx on public.contrat_couts (etablissement_id);
create index if not exists contrat_dpae_etab_idx  on public.contrat_dpae  (etablissement_id);

-- ── RLS : 4 politiques par table, filtrées via public.profiles ───────────
-- Ce sont des données de paie et des obligations déclaratives : lecture ET
-- écriture sont réservées aux comptes admin / superadmin / rh du même
-- établissement. Aucun contrôle existant n'est desserré.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['contrat_couts', 'contrat_dpae']
  loop
    execute format('alter table public.%I enable row level security', tbl);

    execute format('drop policy if exists %I on public.%I', tbl || '_select', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_insert', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_update', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_delete', tbl);

    execute format($f$
      create policy %I on public.%I for select to authenticated
      using (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_select', tbl);

    execute format($f$
      create policy %I on public.%I for insert to authenticated
      with check (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_insert', tbl);

    execute format($f$
      create policy %I on public.%I for update to authenticated
      using (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
      with check (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_update', tbl);

    execute format($f$
      create policy %I on public.%I for delete to authenticated
      using (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_delete', tbl);
  end loop;
end$$;

-- ── Déclencheur updated_at ──────────────────────────────────────────────
create or replace function public.contrats_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['contrat_couts', 'contrat_dpae']
  loop
    execute format('drop trigger if exists %I on public.%I', tbl || '_touch', tbl);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.contrats_touch_updated_at()',
      tbl || '_touch', tbl);
  end loop;
end$$;


-- ═══════════════════════════════════════════════════════════════════
-- [07/22]  migration-cvs.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Conseil de la Vie Sociale : « Boîte à idées des résidents »
--
-- La maquette « CVS - refonte (bento) » ajoute un bloc « Boîte à idées des
-- résidents » : propositions déposées par les résidents et les familles,
-- nombre de soutiens (votes), auteur et statut d'instruction.
-- Aucune table du dépôt ne portait cette donnée (le CVS tient dans un unique
-- objet jsonb `cvs.data` : membres, séances, résolutions, thématiques).
--
-- Script IDEMPOTENT : peut être rejoué sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Tant qu'il ne l'est pas, la page
-- cvs.html reste pleinement utilisable : la lecture renvoie [] avec un
-- console.warn et l'écriture est refusée par un toast nommant ce fichier.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Table ───────────────────────────────────────────────────────────────
create table if not exists public.cvs_idees (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  texte             text not null default '',
  auteur            text not null default '',
  votes             integer not null default 0,
  statut            text not null default 'nouvelle',
  created_by        uuid default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Colonnes ajoutées après coup (rejeu sur une base déjà créée)
alter table public.cvs_idees add column if not exists auteur text not null default '';
alter table public.cvs_idees add column if not exists votes integer not null default 0;
alter table public.cvs_idees add column if not exists statut text not null default 'nouvelle';
alter table public.cvs_idees add column if not exists created_by uuid default auth.uid();
alter table public.cvs_idees add column if not exists updated_at timestamptz not null default now();

-- Statuts d'instruction autorisés (contrainte posée une seule fois)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cvs_idees_statut_chk'
      and conrelid = 'public.cvs_idees'::regclass
  ) then
    alter table public.cvs_idees
      add constraint cvs_idees_statut_chk
      check (statut in ('nouvelle', 'etude', 'retenue', 'rejetee'));
  end if;
end$$;

-- Un compteur de soutiens ne peut pas être négatif
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cvs_idees_votes_chk'
      and conrelid = 'public.cvs_idees'::regclass
  ) then
    alter table public.cvs_idees
      add constraint cvs_idees_votes_chk check (votes >= 0);
  end if;
end$$;

-- Clé étrangère vers profiles — posée seulement si les types concordent,
-- pour que le script ne casse pas si profiles.id n'était pas en uuid.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cvs_idees_created_by_fk'
      and conrelid = 'public.cvs_idees'::regclass
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.cvs_idees
      add constraint cvs_idees_created_by_fk
      foreign key (created_by) references public.profiles(id) on delete set null;
  end if;
end$$;

create index if not exists cvs_idees_etab_idx on public.cvs_idees (etablissement_id);
create index if not exists cvs_idees_votes_idx on public.cvs_idees (etablissement_id, votes desc);

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table public.cvs_idees enable row level security;

drop policy if exists cvs_idees_select on public.cvs_idees;
drop policy if exists cvs_idees_insert on public.cvs_idees;
drop policy if exists cvs_idees_update on public.cvs_idees;
drop policy if exists cvs_idees_delete on public.cvs_idees;

-- Lecture : tout l'établissement (le CVS est une instance collective)
create policy cvs_idees_select
  on public.cvs_idees for select
  to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid()
              and p.etablissement_id = cvs_idees.etablissement_id)
  );

-- Dépôt d'une proposition : dans son propre établissement
create policy cvs_idees_insert
  on public.cvs_idees for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid()
              and p.etablissement_id = cvs_idees.etablissement_id)
  );

-- Mise à jour : soutenir une proposition (votes) et faire évoluer son statut
-- se font au nom du conseil — tout membre de l'établissement peut le faire.
create policy cvs_idees_update
  on public.cvs_idees for update
  to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid()
              and p.etablissement_id = cvs_idees.etablissement_id)
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid()
              and p.etablissement_id = cvs_idees.etablissement_id)
  );

-- Suppression : l'auteur du dépôt, ou l'administration de l'établissement
create policy cvs_idees_delete
  on public.cvs_idees for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid()
              and p.etablissement_id = cvs_idees.etablissement_id
              and (cvs_idees.created_by = auth.uid()
                   or p.role in ('admin', 'superadmin')))
  );


-- ═══════════════════════════════════════════════════════════════════
-- [08/22]  migration-diagnostic-droits.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Diagnostic des droits & obligations (module RH)
--
-- Crée les tables des blocs dessinés dans la maquette « Diagnostic droits (RH) »
-- qui n'avaient aucune source en base :
--   · conformite_obligations → état de conformité de chaque obligation du
--                              référentiel (répondue via l'auto-diagnostic)
--   · conformite_actions     → plan d'action + échéancier légal
--   · conformite_veille      → veille réglementaire (textes à venir)
--   · conformite_referents   → référents obligatoires désignés
--   · conformite_scores      → relevés successifs du score de conformité
--
-- Le RÉFÉRENTIEL lui-même (les 6 domaines et les ~50 obligations légales qui
-- les composent, les 4 rôles de référents obligatoires) est un contenu
-- réglementaire, pas une donnée d'établissement : il vit dans
-- js/diagnostic-droits-v2.js. La base ne stocke que l'ÉTAT de l'établissement.
--
-- Tout le reste de la page est dérivé de ces tables :
--   · score global, tuiles 41/6/3, pourcentage par domaine → conformite_obligations
--   · points de vigilance                                  → obligations non conformes
--   · exposition aux risques                               → conformité du domaine
--   · échéancier légal                                     → conformite_actions
-- Aucune valeur n'est inventée : sans évaluation, la page affiche « — » et
-- « non évalué », jamais 0 %.
--
-- Script IDEMPOTENT : peut être rejoué sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Tant qu'il ne l'est pas, la page
-- reste pleinement utilisable : chaque lecture renvoie [] avec un console.warn
-- et chaque écriture est refusée par un toast nommant ce fichier.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────────

-- État de conformité d'une obligation du référentiel.
-- `code` référence une obligation de DD2_OBLIGATIONS (js/diagnostic-droits-v2.js).
-- statut : conforme | non_conforme  (l'auto-diagnostic ne pose que Oui / Non ;
-- la ventilation « à régulariser » vs « non conforme » découle de la criticité
-- de l'obligation dans le référentiel, elle n'est pas saisie).
create table if not exists public.conformite_obligations (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  code             text not null,
  statut           text not null default 'conforme',
  note             text not null default '',
  evalue_le        date,
  evalue_par       uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Plan d'action / échéancier légal.
create table if not exists public.conformite_actions (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  label            text not null default '',
  detail           text not null default '',
  obligation_code  text not null default '',
  echeance         date,
  priorite         text not null default 'importante',  -- urgente | importante | normale
  fait             boolean not null default false,
  fait_le          date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Veille réglementaire : textes publiés ou à venir suivis par l'établissement.
create table if not exists public.conformite_veille (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  type             text not null default 'LOI',         -- LOI | DÉC | CCN | ARR | CIR
  titre            text not null default '',
  info             text not null default '',            -- « Applicable 01/2027 »
  date_info        date,
  lien             text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Référents obligatoires désignés. `role_code` référence DD2_REFERENTS.
create table if not exists public.conformite_referents (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  role_code        text not null,
  nom              text not null default '',
  employe_id       uuid,
  contact          text not null default '',
  designe_le       date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Relevés successifs du score de conformité (courbe d'évolution).
create table if not exists public.conformite_scores (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  periode          text not null default '',            -- « T2-26 »
  valeur           integer not null default 0,          -- pourcentage 0..100
  date_releve      date not null default current_date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Colonnes ajoutées après coup (rejeu sur une base déjà créée)
alter table public.conformite_obligations add column if not exists note text not null default '';
alter table public.conformite_obligations add column if not exists evalue_le date;
alter table public.conformite_obligations add column if not exists evalue_par uuid;
alter table public.conformite_actions     add column if not exists detail text not null default '';
alter table public.conformite_actions     add column if not exists obligation_code text not null default '';
alter table public.conformite_actions     add column if not exists fait_le date;
alter table public.conformite_veille      add column if not exists lien text not null default '';
alter table public.conformite_veille      add column if not exists date_info date;
alter table public.conformite_referents   add column if not exists contact text not null default '';
alter table public.conformite_referents   add column if not exists designe_le date;

-- Contraintes de valeur
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'conformite_obligations_statut_chk'
      and conrelid = 'public.conformite_obligations'::regclass
  ) then
    alter table public.conformite_obligations
      add constraint conformite_obligations_statut_chk
      check (statut in ('conforme', 'non_conforme'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'conformite_actions_priorite_chk'
      and conrelid = 'public.conformite_actions'::regclass
  ) then
    alter table public.conformite_actions
      add constraint conformite_actions_priorite_chk
      check (priorite in ('urgente', 'importante', 'normale'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'conformite_scores_valeur_chk'
      and conrelid = 'public.conformite_scores'::regclass
  ) then
    alter table public.conformite_scores
      add constraint conformite_scores_valeur_chk
      check (valeur >= 0 and valeur <= 100);
  end if;
end$$;

-- Clé étrangère vers `employes` — posée seulement si les types concordent,
-- pour que le script ne casse pas si employes.id n'était pas en uuid.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'conformite_referents_employe_fk'
      and conrelid = 'public.conformite_referents'::regclass
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'employes'
      and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.conformite_referents
      add constraint conformite_referents_employe_fk
      foreign key (employe_id) references public.employes(id) on delete set null;
  end if;
end$$;

-- Unicité et index
create unique index if not exists conf_oblig_uniq on public.conformite_obligations (etablissement_id, code);
create unique index if not exists conf_ref_uniq   on public.conformite_referents   (etablissement_id, role_code);
create unique index if not exists conf_score_uniq on public.conformite_scores      (etablissement_id, periode);

create index if not exists conf_oblig_etab_idx  on public.conformite_obligations (etablissement_id);
create index if not exists conf_act_etab_idx    on public.conformite_actions     (etablissement_id);
create index if not exists conf_act_ech_idx     on public.conformite_actions     (etablissement_id, echeance);
create index if not exists conf_veille_etab_idx on public.conformite_veille      (etablissement_id);
create index if not exists conf_ref_etab_idx    on public.conformite_referents   (etablissement_id);
create index if not exists conf_score_etab_idx  on public.conformite_scores      (etablissement_id, date_releve);

-- ── RLS : 4 politiques par table, filtrées via public.profiles ───────────
-- Diagnostic de conformité : données d'obligations légales et de responsabilité
-- de l'employeur. Lecture ET écriture réservées aux comptes admin / superadmin
-- / rh du même établissement. Aucun contrôle d'accès existant n'est desserré.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'conformite_obligations',
    'conformite_actions',
    'conformite_veille',
    'conformite_referents',
    'conformite_scores'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);

    execute format('drop policy if exists %I on public.%I', tbl || '_select', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_insert', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_update', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_delete', tbl);

    execute format($f$
      create policy %I on public.%I for select to authenticated
      using (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_select', tbl);

    execute format($f$
      create policy %I on public.%I for insert to authenticated
      with check (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_insert', tbl);

    execute format($f$
      create policy %I on public.%I for update to authenticated
      using (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
      with check (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_update', tbl);

    execute format($f$
      create policy %I on public.%I for delete to authenticated
      using (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_delete', tbl);
  end loop;
end$$;

-- ── Déclencheur updated_at ──────────────────────────────────────────────
create or replace function public.conformite_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'conformite_obligations',
    'conformite_actions',
    'conformite_veille',
    'conformite_referents',
    'conformite_scores'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', tbl || '_touch', tbl);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.conformite_touch_updated_at()',
      tbl || '_touch', tbl);
  end loop;
end$$;

-- ══════════════════════════════════════════════════════════════════════════
-- Aucune donnée n'est insérée : le référentiel est côté application et l'état
-- de conformité se saisit dans la page (auto-diagnostic, plan d'action).
-- ══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════
-- [09/22]  migration-entretiens.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Entretiens professionnels (module RH) — design V2
--
-- Crée les tables des blocs dessinés dans la maquette « Entretien pro (RH) »
-- qui n'avaient aucune source en base :
--   · entretien_souhaits    → souhaits d'évolution / mobilité exprimés
--   · entretien_actions     → actions de formation décidées en entretien
--   · entretien_objectifs   → objectifs de l'année N-1 et leur atteinte
--                             QUALITATIVE (atteint / partiel / non atteint)
--   · entretien_signatures  → compte rendu & signature (salarié, manager)
--   · entretien_recap6      → état récapitulatif à 6 ans (art. L.6315-1) :
--                             les deux obligations non calculables depuis
--                             la table `entretiens`
--
-- ⚠ RÈGLE MÉTIER : l'entretien annuel/professionnel n'attribue JAMAIS de note
-- chiffrée à un salarié. Aucune colonne de ce script ne stocke de note, de
-- moyenne ou de classement : `entretien_objectifs.atteinte` est une énumération
-- textuelle qualitative, et le positionnement métier reste dans
-- `entretiens.grille` (Acquis / En cours d'acquisition / À développer).
--
-- Script IDEMPOTENT : peut être rejoué sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Tant qu'il ne l'est pas, la page
-- reste pleinement utilisable : chaque lecture renvoie [] avec un console.warn
-- et chaque écriture est refusée par un toast nommant ce fichier.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────────
create table if not exists public.entretien_souhaits (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  employe_id       uuid not null,
  entretien_id     uuid,
  souhait          text not null,
  horizon          text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.entretien_actions (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  entretien_id     uuid,
  employe_id       uuid,
  libelle          text not null,
  beneficiaire     text not null default '',
  annee            int,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.entretien_objectifs (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  entretien_id     uuid,
  employe_id       uuid not null,
  libelle          text not null,
  -- Atteinte QUALITATIVE — jamais une note ni un pourcentage.
  atteinte         text not null default 'encours',
  annee            int,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.entretien_signatures (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  entretien_id     uuid not null,
  role             text not null,              -- 'salarie' | 'manager'
  nom              text not null default '',
  statut           text not null default 'attente',   -- 'attente' | 'signe'
  signe_le         timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.entretien_recap6 (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  employe_id       uuid not null,
  periode_debut    date,
  formation_suivie boolean not null default false,
  progression      boolean not null default false,   -- certification / VAE / progression
  commentaire      text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Colonnes ajoutées après coup (rejeu sur une base déjà créée)
alter table public.entretien_souhaits   add column if not exists horizon text not null default '';
alter table public.entretien_souhaits   add column if not exists entretien_id uuid;
alter table public.entretien_actions    add column if not exists annee int;
alter table public.entretien_actions    add column if not exists employe_id uuid;
alter table public.entretien_objectifs  add column if not exists annee int;
alter table public.entretien_objectifs  add column if not exists entretien_id uuid;
alter table public.entretien_signatures add column if not exists signe_le timestamptz;
alter table public.entretien_recap6     add column if not exists commentaire text not null default '';
alter table public.entretien_recap6     add column if not exists periode_debut date;

-- Contraintes de domaine (valeurs qualitatives uniquement)
do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'entretien_objectifs_atteinte_chk'
                   and conrelid = 'public.entretien_objectifs'::regclass) then
    alter table public.entretien_objectifs
      add constraint entretien_objectifs_atteinte_chk
      check (atteinte in ('atteint', 'partiel', 'non', 'encours'));
  end if;

  if not exists (select 1 from pg_constraint
                 where conname = 'entretien_signatures_statut_chk'
                   and conrelid = 'public.entretien_signatures'::regclass) then
    alter table public.entretien_signatures
      add constraint entretien_signatures_statut_chk
      check (statut in ('attente', 'signe', 'refuse'));
  end if;

  if not exists (select 1 from pg_constraint
                 where conname = 'entretien_signatures_role_chk'
                   and conrelid = 'public.entretien_signatures'::regclass) then
    alter table public.entretien_signatures
      add constraint entretien_signatures_role_chk
      check (role in ('salarie', 'manager'));
  end if;
end$$;

-- Clés étrangères — posées seulement si les types concordent, pour que le
-- script ne casse pas si employes.id / entretiens.id n'étaient pas en uuid.
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('entretien_souhaits',   'entretien_souhaits_emp_fk',   'employe_id',   'employes'),
      ('entretien_souhaits',   'entretien_souhaits_ent_fk',   'entretien_id', 'entretiens'),
      ('entretien_actions',    'entretien_actions_emp_fk',    'employe_id',   'employes'),
      ('entretien_actions',    'entretien_actions_ent_fk',    'entretien_id', 'entretiens'),
      ('entretien_objectifs',  'entretien_objectifs_emp_fk',  'employe_id',   'employes'),
      ('entretien_objectifs',  'entretien_objectifs_ent_fk',  'entretien_id', 'entretiens'),
      ('entretien_signatures', 'entretien_signatures_ent_fk', 'entretien_id', 'entretiens'),
      ('entretien_recap6',     'entretien_recap6_emp_fk',     'employe_id',   'employes')
    ) as v(tbl, cname, col, ref)
  loop
    if not exists (
      select 1 from pg_constraint
      where conname = t.cname and conrelid = ('public.' || t.tbl)::regclass
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t.ref
        and column_name = 'id' and data_type = 'uuid'
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.%I(id) on delete cascade',
        t.tbl, t.cname, t.col, t.ref);
    end if;
  end loop;
end$$;

-- Unicité et index
create unique index if not exists entretien_recap6_uniq
  on public.entretien_recap6 (etablissement_id, employe_id);
create unique index if not exists entretien_signatures_uniq
  on public.entretien_signatures (entretien_id, role);
create index if not exists entretien_souhaits_etab_idx  on public.entretien_souhaits (etablissement_id);
create index if not exists entretien_actions_etab_idx   on public.entretien_actions (etablissement_id);
create index if not exists entretien_objectifs_etab_idx on public.entretien_objectifs (etablissement_id);
create index if not exists entretien_objectifs_emp_idx  on public.entretien_objectifs (employe_id);
create index if not exists entretien_signatures_etab_idx on public.entretien_signatures (etablissement_id);
create index if not exists entretien_recap6_etab_idx    on public.entretien_recap6 (etablissement_id);

-- ── RLS : 4 politiques par table, filtrées via public.profiles ───────────
-- Lecture : tout l'établissement authentifié (l'application restreint en plus
-- l'affichage RH — vue globale, échéances, campagne — à l'encadrement, et un
-- salarié ne voit que ses propres entretiens).
-- Écriture : réservée aux comptes admin / superadmin / rh du même établissement.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'entretien_souhaits', 'entretien_actions', 'entretien_objectifs',
    'entretien_signatures', 'entretien_recap6'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);

    execute format('drop policy if exists %I on public.%I', tbl || '_select', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_insert', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_update', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_delete', tbl);

    execute format($f$
      create policy %I on public.%I for select to authenticated
      using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
    $f$, tbl || '_select', tbl);

    execute format($f$
      create policy %I on public.%I for insert to authenticated
      with check (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_insert', tbl);

    execute format($f$
      create policy %I on public.%I for update to authenticated
      using (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
      with check (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_update', tbl);

    execute format($f$
      create policy %I on public.%I for delete to authenticated
      using (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_delete', tbl);
  end loop;
end$$;


-- ═══════════════════════════════════════════════════════════════════
-- [10/22]  migration-finance.sql
-- ═══════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════
-- [11/22]  migration-formations.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Formation & développement des compétences (module RH)
--
-- Crée les tables des blocs dessinés dans la maquette « Formation (RH) » qui
-- n'avaient aucune source en base :
--   · formation_budgets      → enveloppe annuelle + masse salariale
--   · formation_obligations  → recyclages réglementaires à renouveler
--   · formation_parcours     → plan de développement des compétences
--   · formation_cpf          → compteurs CPF déclarés
--   · formation_attestations → attestations / certifications archivées
--   · formation_organismes   → organismes partenaires (Qualiopi)
--
-- La table formation_evaluations est créée par migration-mes-formations.sql :
-- la page Formation la lit seulement, elle ne la crée pas.
--
-- Script IDEMPOTENT : peut être rejoué sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Tant qu'il ne l'est pas, la page
-- reste pleinement utilisable : chaque lecture renvoie [] avec un console.warn
-- et chaque écriture est refusée par un toast nommant ce fichier.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────────
create table if not exists public.formation_budgets (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  annee            int  not null,
  enveloppe        numeric(12,2) not null default 0,
  masse_salariale  numeric(12,2),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.formation_obligations (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  libelle          text not null,
  detail           text not null default '',
  derniere_date    date,
  periodicite_mois int,
  echeance         date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.formation_parcours (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  employe_id       uuid not null,
  intitule         text not null,
  progression      smallint not null default 0,
  annee            int,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.formation_cpf (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  employe_id       uuid not null,
  solde            numeric(10,2) not null default 0,
  maj_le           date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.formation_attestations (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  employe_id       uuid,
  formation_id     uuid,
  titre            text not null,
  delivre_le       date,
  fichier_path     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.formation_organismes (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  nom              text not null,
  specialite       text not null default '',
  contact          text not null default '',
  qualiopi         boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Colonnes ajoutées après coup (rejeu sur une base déjà créée)
alter table public.formation_budgets      add column if not exists masse_salariale numeric(12,2);
alter table public.formation_obligations  add column if not exists echeance date;
alter table public.formation_obligations  add column if not exists periodicite_mois int;
alter table public.formation_parcours     add column if not exists annee int;
alter table public.formation_cpf          add column if not exists maj_le date;
alter table public.formation_attestations add column if not exists fichier_path text;
alter table public.formation_attestations add column if not exists formation_id uuid;
alter table public.formation_organismes   add column if not exists contact text not null default '';

-- Progression bornée 0..100
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'formation_parcours_prog_chk'
      and conrelid = 'public.formation_parcours'::regclass
  ) then
    alter table public.formation_parcours
      add constraint formation_parcours_prog_chk check (progression between 0 and 100);
  end if;
end$$;

-- Clés étrangères — posées seulement si les types concordent, pour que le
-- script ne casse pas si employes.id / formations.id n'étaient pas en uuid.
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('formation_parcours',     'formation_parcours_emp_fk',     'employe_id',   'employes'),
      ('formation_cpf',          'formation_cpf_emp_fk',          'employe_id',   'employes'),
      ('formation_attestations', 'formation_attestations_emp_fk', 'employe_id',   'employes'),
      ('formation_attestations', 'formation_attestations_frm_fk', 'formation_id', 'formations')
    ) as v(tbl, cname, col, ref)
  loop
    if not exists (
      select 1 from pg_constraint
      where conname = t.cname and conrelid = ('public.' || t.tbl)::regclass
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t.ref
        and column_name = 'id' and data_type = 'uuid'
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.%I(id) on delete set null',
        t.tbl, t.cname, t.col, t.ref);
    end if;
  end loop;
end$$;

-- Unicité et index
create unique index if not exists formation_budgets_uniq  on public.formation_budgets (etablissement_id, annee);
create unique index if not exists formation_cpf_uniq      on public.formation_cpf (etablissement_id, employe_id);
create index        if not exists formation_oblig_etab_idx on public.formation_obligations (etablissement_id);
create index        if not exists formation_parc_etab_idx  on public.formation_parcours (etablissement_id);
create index        if not exists formation_att_etab_idx   on public.formation_attestations (etablissement_id);
create index        if not exists formation_org_etab_idx   on public.formation_organismes (etablissement_id);

-- ── RLS : 4 politiques par table, filtrées via public.profiles ───────────
-- Lecture : tout l'établissement (l'application restreint en plus l'affichage
-- des données sensibles — budget, CPF, attestations — à l'encadrement).
-- Écriture : réservée aux comptes admin / rh du même établissement.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'formation_budgets', 'formation_obligations', 'formation_parcours',
    'formation_cpf', 'formation_attestations', 'formation_organismes'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);

    execute format('drop policy if exists %I on public.%I', tbl || '_select', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_insert', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_update', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_delete', tbl);

    execute format($f$
      create policy %I on public.%I for select to authenticated
      using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
    $f$, tbl || '_select', tbl);

    execute format($f$
      create policy %I on public.%I for insert to authenticated
      with check (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_insert', tbl);

    execute format($f$
      create policy %I on public.%I for update to authenticated
      using (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
      with check (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_update', tbl);

    execute format($f$
      create policy %I on public.%I for delete to authenticated
      using (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_delete', tbl);
  end loop;
end$$;


-- ═══════════════════════════════════════════════════════════════════
-- [12/22]  migration-inventaire.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — « Inventaire & matériel » (pilotage) — design V2
--
-- La maquette « Inventaire (pilotage) » affiche plusieurs blocs qui n'ont
-- aucune source en base aujourd'hui :
--   1. « Niveau / Sous seuil / Réapprovisionnement à commander »
--        → il manque un SEUIL D'ALERTE par article.
--   2. « Valeur du parc » et sa ventilation par catégorie
--        → il manque une VALEUR UNITAIRE par article.
--   3. « Maintenance à prévoir »
--        → il manque une DATE DE PROCHAINE MAINTENANCE (l'existant ne stocke
--          que la dernière maintenance réalisée).
--   4. « Garanties & contrats »
--        → il manque le type et l'échéance de garantie.
--   5. « Derniers mouvements de stock » et « Taux de rotation »
--        → table public.inventaire_mouvements.
--   6. « Inventaire annuel » (comptage physique, écarts)
--        → table public.inventaire_comptages.
--   7. « Fournisseurs »
--        → table public.inventaire_fournisseurs.
--
-- Script IDEMPOTENT : peut être rejoué sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Tant qu'il ne l'est pas, la page
-- reste pleinement utilisable : la lecture renvoie [] (avec un console.warn)
-- et l'écriture est refusée avec un message nommant ce fichier.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ══════════════════════════════════════════════════════════════════════════
-- 1) COLONNES MANQUANTES SUR public.inventaire
-- ══════════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public.inventaire') is not null then
    alter table public.inventaire add column if not exists seuil_alerte          integer;
    alter table public.inventaire add column if not exists valeur_unitaire       numeric(12,2);
    alter table public.inventaire add column if not exists maintenance_prochaine date;
    alter table public.inventaire add column if not exists garantie_type         text;
    alter table public.inventaire add column if not exists garantie_fin          date;
  end if;
end$$;

-- ══════════════════════════════════════════════════════════════════════════
-- 2) MOUVEMENTS DE STOCK (entrées / sorties)
--    Écriture ouverte à tout l'établissement : ce sont les équipes de terrain
--    qui réceptionnent et sortent le matériel.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.inventaire_mouvements (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  article_id        uuid,
  article_nom       text not null default '',
  cat               text,
  delta             integer not null default 0,
  motif             text,
  auteur            text,
  created_at        timestamptz not null default now()
);

alter table public.inventaire_mouvements add column if not exists cat text;

create index if not exists inventaire_mouvements_etab_idx
  on public.inventaire_mouvements (etablissement_id, created_at desc);
create index if not exists inventaire_mouvements_article_idx
  on public.inventaire_mouvements (article_id);

alter table public.inventaire_mouvements enable row level security;

drop policy if exists inventaire_mouvements_select on public.inventaire_mouvements;
drop policy if exists inventaire_mouvements_insert on public.inventaire_mouvements;
drop policy if exists inventaire_mouvements_update on public.inventaire_mouvements;
drop policy if exists inventaire_mouvements_delete on public.inventaire_mouvements;

create policy inventaire_mouvements_select
  on public.inventaire_mouvements for select
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy inventaire_mouvements_insert
  on public.inventaire_mouvements for insert
  to authenticated
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy inventaire_mouvements_update
  on public.inventaire_mouvements for update
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  )
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy inventaire_mouvements_delete
  on public.inventaire_mouvements for delete
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ══════════════════════════════════════════════════════════════════════════
-- 3) COMPTAGE PHYSIQUE ANNUEL
--    Une ligne par article et par exercice : quantité théorique au moment du
--    pointage, quantité comptée, auteur et date.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.inventaire_comptages (
  id                  uuid primary key default gen_random_uuid(),
  etablissement_id    text not null,
  annee               smallint not null,
  article_id          uuid not null,
  quantite_theorique  integer not null default 0,
  quantite_comptee    integer not null default 0,
  compte_par          text,
  compte_le           timestamptz not null default now()
);

create unique index if not exists inventaire_comptages_uniq
  on public.inventaire_comptages (etablissement_id, annee, article_id);

alter table public.inventaire_comptages enable row level security;

drop policy if exists inventaire_comptages_select on public.inventaire_comptages;
drop policy if exists inventaire_comptages_insert on public.inventaire_comptages;
drop policy if exists inventaire_comptages_update on public.inventaire_comptages;
drop policy if exists inventaire_comptages_delete on public.inventaire_comptages;

create policy inventaire_comptages_select
  on public.inventaire_comptages for select
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy inventaire_comptages_insert
  on public.inventaire_comptages for insert
  to authenticated
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy inventaire_comptages_update
  on public.inventaire_comptages for update
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  )
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy inventaire_comptages_delete
  on public.inventaire_comptages for delete
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ══════════════════════════════════════════════════════════════════════════
-- 4) FOURNISSEURS (référencement, spécialité, délai de livraison)
--    Écriture réservée aux administrateurs.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.inventaire_fournisseurs (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  nom               text not null,
  specialite        text,
  delai             text,
  contact           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.inventaire_fournisseurs add column if not exists contact text;
alter table public.inventaire_fournisseurs add column if not exists updated_at timestamptz not null default now();

create index if not exists inventaire_fournisseurs_etab_idx
  on public.inventaire_fournisseurs (etablissement_id);

alter table public.inventaire_fournisseurs enable row level security;

drop policy if exists inventaire_fournisseurs_select on public.inventaire_fournisseurs;
drop policy if exists inventaire_fournisseurs_insert on public.inventaire_fournisseurs;
drop policy if exists inventaire_fournisseurs_update on public.inventaire_fournisseurs;
drop policy if exists inventaire_fournisseurs_delete on public.inventaire_fournisseurs;

create policy inventaire_fournisseurs_select
  on public.inventaire_fournisseurs for select
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy inventaire_fournisseurs_insert
  on public.inventaire_fournisseurs for insert
  to authenticated
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy inventaire_fournisseurs_update
  on public.inventaire_fournisseurs for update
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy inventaire_fournisseurs_delete
  on public.inventaire_fournisseurs for delete
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );


-- ═══════════════════════════════════════════════════════════════════
-- [13/22]  migration-mes-conges.sql
-- ═══════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════
-- MES CONGÉS — compteurs de congés par salarié (« Mes compteurs »)
--
-- La maquette « Demandes congés (RH) » affiche des compteurs (CP N-1, CP N,
-- RTT, récupération, CET) qui n'avaient aucune source en base. Cette table
-- les porte, saisis par l'administration, lus en seule lecture par la page
-- mes-conges.html.
--
-- Idempotent : exécutable plusieurs fois sans erreur.
-- À exécuter dans l'éditeur SQL Supabase. NE PAS exécuter automatiquement.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.conges_soldes (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  employe_id        text not null,
  annee             integer not null default extract(year from current_date),
  cp_n1             numeric(5,2),
  cp_acquis         numeric(5,2),
  cp_pris           numeric(5,2),
  rtt               numeric(5,2),
  recup             numeric(5,2),
  cet               numeric(5,2),
  commentaire       text default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists conges_soldes_uniq
  on public.conges_soldes (etablissement_id, employe_id, annee);
create index if not exists conges_soldes_employe_idx
  on public.conges_soldes (employe_id);

alter table public.conges_soldes enable row level security;

-- Les quatre politiques sont filtrées par l'établissement du profil connecté.
drop policy if exists conges_soldes_select on public.conges_soldes;
create policy conges_soldes_select on public.conges_soldes
  for select to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists conges_soldes_insert on public.conges_soldes;
create policy conges_soldes_insert on public.conges_soldes
  for insert to authenticated
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists conges_soldes_update on public.conges_soldes;
create policy conges_soldes_update on public.conges_soldes
  for update to authenticated
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

drop policy if exists conges_soldes_delete on public.conges_soldes;
create policy conges_soldes_delete on public.conges_soldes
  for delete to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Tant que cette migration n'est pas exécutée, mes-conges.html affiche le bloc
-- « Mes compteurs » vide (console.warn), sans jamais inventer de valeur.


-- ═══════════════════════════════════════════════════════════════════
-- [14/22]  migration-mes-fiches-paie.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════
-- INTERNALIS — Mes fiches de paie : demandes d'attestation de salaire
-- Idempotent : exécutable plusieurs fois sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase.
-- ══════════════════════════════════════════════════════════════════════

create table if not exists public.attestations_salaire (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  profile_id        uuid references auth.users(id) on delete set null,
  employe_id        text not null default '',
  employe_nom       text not null default '',
  motif             text not null default 'Attestation de salaire',
  periode_debut     text,
  periode_fin       text,
  commentaire       text not null default '',
  statut            text not null default 'demandee',
  traite_par        text,
  traite_le         timestamptz,
  created_at        timestamptz not null default now()
);

-- Colonnes ajoutées après coup (idempotence sur une table préexistante)
alter table public.attestations_salaire add column if not exists traite_par text;
alter table public.attestations_salaire add column if not exists traite_le  timestamptz;

create index if not exists attestations_salaire_etab_idx
  on public.attestations_salaire (etablissement_id, created_at desc);
create index if not exists attestations_salaire_profile_idx
  on public.attestations_salaire (profile_id);

alter table public.attestations_salaire enable row level security;

-- ── Politiques (filtrées par public.profiles) ─────────────────────────
-- Lecture : tout membre de l'établissement (RH/admin voient les demandes,
-- le salarié voit les siennes ; le filtrage fin se fait côté application).
drop policy if exists attestations_salaire_select on public.attestations_salaire;
create policy attestations_salaire_select on public.attestations_salaire
  for select using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Création : uniquement pour soi, dans son établissement.
drop policy if exists attestations_salaire_insert on public.attestations_salaire;
create policy attestations_salaire_insert on public.attestations_salaire
  for insert with check (
    profile_id = auth.uid()
    and etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Mise à jour : l'auteur (tant que la demande n'est pas traitée) ou un
-- profil admin/RH du même établissement.
drop policy if exists attestations_salaire_update on public.attestations_salaire;
create policy attestations_salaire_update on public.attestations_salaire
  for update using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and (
      profile_id = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
      )
    )
  ) with check (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Suppression : l'auteur ou un profil admin/RH du même établissement.
drop policy if exists attestations_salaire_delete on public.attestations_salaire;
create policy attestations_salaire_delete on public.attestations_salaire
  for delete using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and (
      profile_id = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
      )
    )
  );


-- ═══════════════════════════════════════════════════════════════════
-- [15/22]  migration-mes-formations.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — « Mes formations » (espace personnel du salarié)
--
-- Ajoute le retour d'expérience du salarié sur les formations qu'il a suivies
-- (note, ressenti « à chaud » juste après la session, ressenti « à froid »
-- quelques semaines plus tard, une fois la mise en pratique faite).
-- Repris de la maquette « Formation (RH) », bloc « Évaluations ».
--
-- Script IDEMPOTENT : peut être rejoué sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Tant qu'il ne l'est pas, la page
-- reste pleinement utilisable : la lecture renvoie [] et l'écriture est
-- refusée avec un message nommant ce fichier.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Table ───────────────────────────────────────────────────────────────
create table if not exists public.formation_evaluations (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  formation_id      uuid not null,
  employe_id        uuid,
  profile_id        uuid not null default auth.uid(),
  note              smallint,
  chaud             text not null default '',
  froid             text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Colonnes ajoutées après coup (rejeu sur une base déjà créée)
alter table public.formation_evaluations add column if not exists employe_id uuid;
alter table public.formation_evaluations add column if not exists chaud text not null default '';
alter table public.formation_evaluations add column if not exists froid text not null default '';
alter table public.formation_evaluations add column if not exists updated_at timestamptz not null default now();

-- Note bornée 1..5 (contrainte posée une seule fois)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'formation_evaluations_note_chk'
      and conrelid = 'public.formation_evaluations'::regclass
  ) then
    alter table public.formation_evaluations
      add constraint formation_evaluations_note_chk
      check (note is null or (note between 1 and 5));
  end if;
end$$;

-- Clés étrangères — posées seulement si les types concordent, pour que le
-- script ne casse pas si formations.id / profiles.id n'étaient pas en uuid.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'formation_evaluations_formation_fk'
      and conrelid = 'public.formation_evaluations'::regclass
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'formations'
      and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.formation_evaluations
      add constraint formation_evaluations_formation_fk
      foreign key (formation_id) references public.formations(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'formation_evaluations_profile_fk'
      and conrelid = 'public.formation_evaluations'::regclass
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.formation_evaluations
      add constraint formation_evaluations_profile_fk
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;
end$$;

-- Une seule évaluation par salarié et par formation
create unique index if not exists formation_evaluations_uniq
  on public.formation_evaluations (formation_id, profile_id);
create index if not exists formation_evaluations_etab_idx
  on public.formation_evaluations (etablissement_id);

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table public.formation_evaluations enable row level security;

drop policy if exists formation_evaluations_select on public.formation_evaluations;
drop policy if exists formation_evaluations_insert on public.formation_evaluations;
drop policy if exists formation_evaluations_update on public.formation_evaluations;
drop policy if exists formation_evaluations_delete on public.formation_evaluations;

-- Lecture : tout l'établissement (le service RH consolide les retours)
create policy formation_evaluations_select
  on public.formation_evaluations for select
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

-- Écriture : uniquement sa propre évaluation, dans son établissement
create policy formation_evaluations_insert
  on public.formation_evaluations for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy formation_evaluations_update
  on public.formation_evaluations for update
  to authenticated
  using (
    profile_id = auth.uid()
    and etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  )
  with check (
    profile_id = auth.uid()
    and etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy formation_evaluations_delete
  on public.formation_evaluations for delete
  to authenticated
  using (
    profile_id = auth.uid()
    and etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );


-- ═══════════════════════════════════════════════════════════════════
-- [16/22]  migration-messages.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- Conversations épinglées (page Messages)
--
-- À exécuter UNE FOIS dans l'éditeur SQL de Supabase. Idempotent.
--
-- Apporté par la maquette « Messages - refonte (bento) » : la liste des
-- conversations y affiche une épingle et un filtre « Épinglées ». Rien
-- d'équivalent n'existait en base — la table conversations ne porte que les
-- participants, pas de préférence d'affichage par utilisateur.
--
-- L'épinglage est PERSONNEL : chacun épingle ses propres conversations, une
-- ligne par (compte, conversation). Les autres données de la maquette
-- (présence « en ligne », « en train d'écrire… », pièces jointes) ne sont pas
-- créées ici : elles n'ont pas d'usage métier avéré et la page ne les affiche
-- donc pas.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.messages_epingles (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  profile_id       uuid not null,                   -- auth.uid() du propriétaire
  conv_id          text not null,                   -- conversations.conv_id
  created_at       timestamptz not null default now()
);

-- Une conversation ne peut être épinglée qu'une fois par compte : c'est cette
-- contrainte qui rend le bouton d'épinglage idempotent côté client.
create unique index if not exists messages_epingles_profil_conv_uidx
  on public.messages_epingles (profile_id, conv_id);
create index if not exists messages_epingles_etab_idx
  on public.messages_epingles (etablissement_id, created_at desc);

alter table public.messages_epingles enable row level security;

-- Lecture : uniquement SES propres épingles, et seulement dans son
-- établissement. Une épingle est une préférence privée d'affichage : aucun
-- collègue n'a de raison de voir ce que les autres gardent en haut de liste.
drop policy if exists messages_epingles_select on public.messages_epingles;
create policy messages_epingles_select on public.messages_epingles
  for select to authenticated using (
    messages_epingles.profile_id = auth.uid()
    and exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = messages_epingles.etablissement_id));

-- Création : uniquement pour soi-même, dans son propre établissement.
drop policy if exists messages_epingles_insert on public.messages_epingles;
create policy messages_epingles_insert on public.messages_epingles
  for insert to authenticated with check (
    messages_epingles.profile_id = auth.uid()
    and exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = messages_epingles.etablissement_id));

-- Modification : même règle (aucun transfert d'épingle vers un autre compte).
drop policy if exists messages_epingles_update on public.messages_epingles;
create policy messages_epingles_update on public.messages_epingles
  for update to authenticated using (
    messages_epingles.profile_id = auth.uid()
    and exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = messages_epingles.etablissement_id));

-- Retrait : chacun désépingle ses propres conversations.
drop policy if exists messages_epingles_delete on public.messages_epingles;
create policy messages_epingles_delete on public.messages_epingles
  for delete to authenticated using (
    messages_epingles.profile_id = auth.uid()
    and exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = messages_epingles.etablissement_id));

comment on table public.messages_epingles is
  'Conversations épinglées par un compte sur la page Messages (préférence privée d''affichage, une ligne par compte et par conversation).';


-- ═══════════════════════════════════════════════════════════════════
-- [17/22]  migration-paie.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════
-- INTERNALIS — Fiches de paie (RH) : cycle de paie, statuts de bulletin,
-- soldes de tout compte.
--
-- Idempotent : exécutable plusieurs fois sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase.
--
-- Sans ces tables la page paie.html reste utilisable : les blocs concernés
-- s'affichent vides (« non renseigné ») et toute écriture est refusée avec
-- un message nommant ce fichier. Aucune valeur n'est inventée.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1) Cycle de paie du mois ───────────────────────────────────────────
-- Une ligne par établissement et par période (YYYY-MM).
-- Alimente : le fil du workflow, le bloc DSN, les échéances déclaratives
-- et la part patronale de la masse salariale.
create table if not exists public.paie_periodes (
  id                     uuid primary key default gen_random_uuid(),
  etablissement_id       text not null,
  periode                text not null,                 -- 'YYYY-MM'
  etape                  text not null default 'collecte',
                                                        -- collecte | calcul | controle | virement | dsn | termine
  dsn_statut             text not null default 'a_transmettre',
                                                        -- a_transmettre | transmise
  dsn_transmise_le       timestamptz,
  dsn_date_limite        date,
  urssaf_montant         numeric,
  retraite_montant       numeric,
  prevoyance_montant     numeric,
  cotisations_patronales numeric,
  virement_date          date,
  commentaire            text not null default '',
  maj_par                text not null default '',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create unique index if not exists paie_periodes_uniq
  on public.paie_periodes (etablissement_id, periode);

alter table public.paie_periodes enable row level security;

drop policy if exists paie_periodes_select on public.paie_periodes;
create policy paie_periodes_select on public.paie_periodes
  for select using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists paie_periodes_insert on public.paie_periodes;
create policy paie_periodes_insert on public.paie_periodes
  for insert with check (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  );

drop policy if exists paie_periodes_update on public.paie_periodes;
create policy paie_periodes_update on public.paie_periodes
  for update using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  ) with check (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists paie_periodes_delete on public.paie_periodes;
create policy paie_periodes_delete on public.paie_periodes
  for delete using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  );


-- ── 2) Statut et éléments individuels d'un bulletin ────────────────────
-- Une ligne par fiche de paie. Alimente : la colonne « Statut » du tableau,
-- le bloc prélèvement à la source et le bloc acomptes & saisies.
create table if not exists public.paie_bulletin_statuts (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  fiche_paie_id    text not null,
  employe_id       text not null default '',
  statut           text not null default 'calcule',    -- calcule | verifier | valide
  taux_pas         numeric,                            -- taux de prélèvement à la source (%)
  montant_pas      numeric,                            -- montant prélevé (€)
  acompte          numeric,                            -- acompte / saisie (€, positif)
  acompte_motif    text not null default '',
  distribue_le     timestamptz,                        -- mise à disposition coffre-fort
  valide_par       text,
  valide_le        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists paie_bulletin_statuts_uniq
  on public.paie_bulletin_statuts (etablissement_id, fiche_paie_id);
create index if not exists paie_bulletin_statuts_emp_idx
  on public.paie_bulletin_statuts (etablissement_id, employe_id);

alter table public.paie_bulletin_statuts enable row level security;

drop policy if exists paie_bulletin_statuts_select on public.paie_bulletin_statuts;
create policy paie_bulletin_statuts_select on public.paie_bulletin_statuts
  for select using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists paie_bulletin_statuts_insert on public.paie_bulletin_statuts;
create policy paie_bulletin_statuts_insert on public.paie_bulletin_statuts
  for insert with check (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  );

drop policy if exists paie_bulletin_statuts_update on public.paie_bulletin_statuts;
create policy paie_bulletin_statuts_update on public.paie_bulletin_statuts
  for update using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  ) with check (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists paie_bulletin_statuts_delete on public.paie_bulletin_statuts;
create policy paie_bulletin_statuts_delete on public.paie_bulletin_statuts
  for delete using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  );


-- ── 3) Solde de tout compte (fin de contrat) ───────────────────────────
create table if not exists public.paie_soldes_tout_compte (
  id                   uuid primary key default gen_random_uuid(),
  etablissement_id     text not null,
  employe_id           text not null,
  employe_nom          text not null default '',
  motif                text not null default '',        -- fin de CDD, démission, rupture…
  date_fin             date,
  indemnite_precarite  numeric,
  conges_payes_solde   numeric,
  autres_indemnites    numeric,
  net_a_verser         numeric,
  statut               text not null default 'prepare', -- prepare | valide | verse
  documents_generes_le timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists paie_stc_etab_idx
  on public.paie_soldes_tout_compte (etablissement_id, date_fin desc);

alter table public.paie_soldes_tout_compte enable row level security;

drop policy if exists paie_stc_select on public.paie_soldes_tout_compte;
create policy paie_stc_select on public.paie_soldes_tout_compte
  for select using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists paie_stc_insert on public.paie_soldes_tout_compte;
create policy paie_stc_insert on public.paie_soldes_tout_compte
  for insert with check (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  );

drop policy if exists paie_stc_update on public.paie_soldes_tout_compte;
create policy paie_stc_update on public.paie_soldes_tout_compte
  for update using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  ) with check (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists paie_stc_delete on public.paie_soldes_tout_compte;
create policy paie_stc_delete on public.paie_soldes_tout_compte
  for delete using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  );


-- ═══════════════════════════════════════════════════════════════════
-- [18/22]  migration-pilotage.sql
-- ═══════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════
-- [19/22]  migration-planning-equipe.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Planning équipe · seuils réglementaires (Code du travail)
--
-- Le panneau « Conformité — Code du travail » de planning-equipe.html contrôle
-- automatiquement le planning. Les seuils légaux sont codés en dur côté page
-- (repos quotidien 11 h, repos hebdomadaire 35 h, 10 h/jour, 48 h/semaine…).
-- Cette table permet à un établissement de les AJUSTER (accord d'entreprise,
-- CCN 66, dérogation nuit…) sans toucher au code.
--
-- Dégradation douce : si la table n'existe pas, la page utilise les seuils
-- légaux par défaut, journalise un console.warn et reste pleinement utilisable ;
-- seule la modification d'un seuil est refusée, avec un toast citant ce fichier.
--
-- Script IDEMPOTENT : réexécutable sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Aucune donnée n'est semée : sans
-- ligne, ce sont les seuils légaux par défaut qui s'appliquent.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.planning_regles_travail (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  code             text        not null,   -- repos_quotidien, repos_hebdo, duree_jour…
  seuil            numeric     not null,   -- valeur en heures (ou en nombre pour les règles de comptage)
  actif            boolean     not null default true,
  commentaire      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Un seul seuil par règle et par établissement
create unique index if not exists planning_regles_travail_etab_code_idx
  on public.planning_regles_travail (etablissement_id, code);

create index if not exists planning_regles_travail_etab_idx
  on public.planning_regles_travail (etablissement_id);

alter table public.planning_regles_travail enable row level security;

-- ── Politiques : cloisonnement par établissement via public.profiles ──────
drop policy if exists planning_regles_travail_select on public.planning_regles_travail;
create policy planning_regles_travail_select
  on public.planning_regles_travail for select
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists planning_regles_travail_insert on public.planning_regles_travail;
create policy planning_regles_travail_insert
  on public.planning_regles_travail for insert
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists planning_regles_travail_update on public.planning_regles_travail;
create policy planning_regles_travail_update
  on public.planning_regles_travail for update
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

drop policy if exists planning_regles_travail_delete on public.planning_regles_travail;
create policy planning_regles_travail_delete
  on public.planning_regles_travail for delete
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Horodatage de mise à jour
create or replace function public.planning_regles_travail_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists planning_regles_travail_touch_trg on public.planning_regles_travail;
create trigger planning_regles_travail_touch_trg
  before update on public.planning_regles_travail
  for each row execute function public.planning_regles_travail_touch();


-- ═══════════════════════════════════════════════════════════════════
-- [20/22]  migration-pointage.sql
-- ═══════════════════════════════════════════════════════════════════

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


-- ═══════════════════════════════════════════════════════════════════
-- [21/22]  migration-rapport.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Rapport d'activité · suivi & historique
--
-- La maquette « Rapport d'activité (pilotage) » affiche quatre blocs qui
-- n'avaient aucune source en base :
--   · « Comptes rendus obligatoires »  (Rapport annuel ARS, Bilan CVS…)
--   · « Diffusion du rapport »         (CA, ARS / Département, CVS, équipe)
--   · « Prochaine échéance »           (date de remise du rapport annuel)
--   · « Historique des rapports »      (rapports déjà générés)
-- Les trois premiers sont portés par public.rapport_suivi (une ligne par
-- élément, discriminée par la colonne `type`), le quatrième par
-- public.rapports_generes, alimentée automatiquement à chaque génération
-- de PDF depuis rapport.html.
--
-- Tout le reste de la page (taux d'occupation, mouvements, sections,
-- comparaison N-1, SERAFIN-PH, contributions) est calculé à partir des
-- tables déjà existantes : rien à créer.
--
-- Dégradation douce : tant que ce script n'a pas été exécuté, la page reste
-- pleinement utilisable — la lecture renvoie [] avec un console.warn, les
-- blocs concernés affichent un état vide (aucune valeur inventée) et seule
-- l'écriture est refusée, avec un toast citant ce fichier.
--
-- Script IDEMPOTENT : réexécutable sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Aucune donnée n'est semée.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ══ 1) SUIVI DU RAPPORT ═════════════════════════════════════════════════
create table if not exists public.rapport_suivi (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  type             text        not null,          -- obligatoire | diffusion | echeance
  libelle          text        not null,
  statut           text,                          -- cf. contrainte ci-dessous
  echeance         date,                          -- renseignée pour type = 'echeance'
  annee            smallint,                      -- exercice concerné (facultatif)
  ordre            smallint    not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Colonnes ajoutées après coup (rejeu sur une base déjà créée)
alter table public.rapport_suivi add column if not exists statut     text;
alter table public.rapport_suivi add column if not exists echeance   date;
alter table public.rapport_suivi add column if not exists annee      smallint;
alter table public.rapport_suivi add column if not exists ordre      smallint not null default 0;
alter table public.rapport_suivi add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rapport_suivi_type_chk' and conrelid = 'public.rapport_suivi'::regclass
  ) then
    alter table public.rapport_suivi
      add constraint rapport_suivi_type_chk
      check (type in ('obligatoire', 'diffusion', 'echeance'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'rapport_suivi_statut_chk' and conrelid = 'public.rapport_suivi'::regclass
  ) then
    alter table public.rapport_suivi
      add constraint rapport_suivi_statut_chk
      check (statut is null or statut in (
        'fait', 'en_cours', 'planifie',
        'transmis', 'a_transmettre', 'presente', 'non_concerne'
      ));
  end if;

  -- Une échéance porte une date ; les deux autres types portent un statut.
  if not exists (
    select 1 from pg_constraint
    where conname = 'rapport_suivi_coherence_chk' and conrelid = 'public.rapport_suivi'::regclass
  ) then
    alter table public.rapport_suivi
      add constraint rapport_suivi_coherence_chk
      check (
        (type = 'echeance' and echeance is not null)
        or (type <> 'echeance')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'rapport_suivi_annee_chk' and conrelid = 'public.rapport_suivi'::regclass
  ) then
    alter table public.rapport_suivi
      add constraint rapport_suivi_annee_chk
      check (annee is null or annee between 2000 and 2100);
  end if;
end$$;

create index if not exists rapport_suivi_etab_idx  on public.rapport_suivi (etablissement_id);
create index if not exists rapport_suivi_type_idx  on public.rapport_suivi (type, annee);

alter table public.rapport_suivi enable row level security;

drop policy if exists rapport_suivi_select on public.rapport_suivi;
drop policy if exists rapport_suivi_insert on public.rapport_suivi;
drop policy if exists rapport_suivi_update on public.rapport_suivi;
drop policy if exists rapport_suivi_delete on public.rapport_suivi;

create policy rapport_suivi_select
  on public.rapport_suivi for select
  to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

create policy rapport_suivi_insert
  on public.rapport_suivi for insert
  to authenticated
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

create policy rapport_suivi_update
  on public.rapport_suivi for update
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

create policy rapport_suivi_delete
  on public.rapport_suivi for delete
  to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

create or replace function public.rapport_suivi_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists rapport_suivi_touch_trg on public.rapport_suivi;
create trigger rapport_suivi_touch_trg
  before update on public.rapport_suivi
  for each row execute function public.rapport_suivi_touch();


-- ══ 2) HISTORIQUE DES RAPPORTS GÉNÉRÉS ══════════════════════════════════
create table if not exists public.rapports_generes (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  libelle          text        not null,
  periode_type     text,                          -- mois | annee
  periode_debut    date,
  periode_fin      date,
  genere_le        timestamptz not null default now(),
  genere_par       text,
  genere_par_id    uuid,
  created_at       timestamptz not null default now()
);

alter table public.rapports_generes add column if not exists periode_type  text;
alter table public.rapports_generes add column if not exists periode_debut date;
alter table public.rapports_generes add column if not exists periode_fin   date;
alter table public.rapports_generes add column if not exists genere_par    text;
alter table public.rapports_generes add column if not exists genere_par_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rapports_generes_type_chk' and conrelid = 'public.rapports_generes'::regclass
  ) then
    alter table public.rapports_generes
      add constraint rapports_generes_type_chk
      check (periode_type is null or periode_type in ('mois', 'annee'));
  end if;
end$$;

create index if not exists rapports_generes_etab_idx on public.rapports_generes (etablissement_id);
create index if not exists rapports_generes_date_idx on public.rapports_generes (genere_le desc);

alter table public.rapports_generes enable row level security;

drop policy if exists rapports_generes_select on public.rapports_generes;
drop policy if exists rapports_generes_insert on public.rapports_generes;
drop policy if exists rapports_generes_update on public.rapports_generes;
drop policy if exists rapports_generes_delete on public.rapports_generes;

create policy rapports_generes_select
  on public.rapports_generes for select
  to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

create policy rapports_generes_insert
  on public.rapports_generes for insert
  to authenticated
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

create policy rapports_generes_update
  on public.rapports_generes for update
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

create policy rapports_generes_delete
  on public.rapports_generes for delete
  to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════════════════════════
-- [22/22]  migration-recrutement.sql
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Recrutement (module RH)
--
-- Crée les tables des blocs dessinés dans la maquette « Recrutement (RH) »
-- qui n'avaient aucune source en base :
--   · recrutement_offres        → offres d'emploi publiées (poste, contrat, statut, coût)
--   · recrutement_candidat_meta → rattachement d'un candidat à une offre,
--                                 canal d'origine, vivier / CV-thèque
--   · recrutement_scorecard     → grille d'évaluation d'un candidat (critère + note)
--   · recrutement_onboarding    → check-list d'intégration d'un candidat recruté
--   · recrutement_diffusion     → diffusion multi-canal d'une offre
--
-- Tout le reste de la page (pipeline, statistiques, entretiens à venir, taux de
-- transformation, délai moyen, taux de réponse) est dérivé de la table
-- `candidats` existante : aucune valeur n'est inventée.
--
-- Script IDEMPOTENT : peut être rejoué sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Tant qu'il ne l'est pas, la page
-- reste pleinement utilisable : chaque lecture renvoie [] avec un console.warn
-- et chaque écriture est refusée par un toast nommant ce fichier.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────────

-- Offre d'emploi. `cout` = coût de recrutement engagé (annonces, cabinet…),
-- donnée budgétaire : lecture et écriture réservées à l'encadrement (voir RLS).
create table if not exists public.recrutement_offres (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  titre            text not null default '',
  contrat          text not null default 'CDI',
  statut           text not null default 'ouverte',   -- ouverte | urgente | pourvue | close
  date_ouverture   date,
  cout             numeric(12,2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Métadonnées de candidature : offre visée, canal d'origine, vivier.
create table if not exists public.recrutement_candidat_meta (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  candidat_id      uuid not null,
  offre_id         uuid,
  canal            text not null default '',          -- Indeed, France Travail, Cooptation…
  vivier           boolean not null default false,    -- profil conservé en CV-thèque
  dispo            text not null default '',          -- disponibilité déclarée
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Grille d'évaluation d'entretien (scorecard). Donnée d'évaluation :
-- lecture et écriture réservées à l'encadrement (voir RLS).
create table if not exists public.recrutement_scorecard (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  candidat_id      uuid not null,
  critere          text not null default '',
  note             numeric(3,1) not null default 0,   -- de 0 à 5
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Check-list d'intégration d'un candidat recruté.
create table if not exists public.recrutement_onboarding (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  candidat_id      uuid not null,
  etape            text not null default '',
  fait             boolean not null default false,
  fait_le          date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Diffusion d'une offre sur un canal donné.
create table if not exists public.recrutement_diffusion (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  offre_id         uuid,
  canal            text not null default '',
  statut           text not null default 'a_publier', -- a_publier | publiee | en_ligne | retiree
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Colonnes ajoutées après coup (rejeu sur une base déjà créée)
alter table public.recrutement_offres        add column if not exists cout numeric(12,2) not null default 0;
alter table public.recrutement_offres        add column if not exists date_ouverture date;
alter table public.recrutement_candidat_meta add column if not exists dispo text not null default '';
alter table public.recrutement_candidat_meta add column if not exists vivier boolean not null default false;
alter table public.recrutement_onboarding    add column if not exists fait_le date;

-- Contraintes de valeur
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recrutement_offres_statut_chk'
      and conrelid = 'public.recrutement_offres'::regclass
  ) then
    alter table public.recrutement_offres
      add constraint recrutement_offres_statut_chk
      check (statut in ('ouverte', 'urgente', 'pourvue', 'close'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recrutement_offres_cout_chk'
      and conrelid = 'public.recrutement_offres'::regclass
  ) then
    alter table public.recrutement_offres
      add constraint recrutement_offres_cout_chk check (cout >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recrutement_scorecard_note_chk'
      and conrelid = 'public.recrutement_scorecard'::regclass
  ) then
    alter table public.recrutement_scorecard
      add constraint recrutement_scorecard_note_chk check (note >= 0 and note <= 5);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'recrutement_diffusion_statut_chk'
      and conrelid = 'public.recrutement_diffusion'::regclass
  ) then
    alter table public.recrutement_diffusion
      add constraint recrutement_diffusion_statut_chk
      check (statut in ('a_publier', 'publiee', 'en_ligne', 'retiree'));
  end if;
end$$;

-- Clés étrangères — posées seulement si les types concordent, pour que le
-- script ne casse pas si candidats.id n'était pas en uuid.
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('recrutement_candidat_meta', 'rc_meta_cand_fk',  'candidat_id', 'candidats'),
      ('recrutement_candidat_meta', 'rc_meta_offre_fk', 'offre_id',    'recrutement_offres'),
      ('recrutement_scorecard',     'rc_score_cand_fk', 'candidat_id', 'candidats'),
      ('recrutement_onboarding',    'rc_onb_cand_fk',   'candidat_id', 'candidats'),
      ('recrutement_diffusion',     'rc_diff_offre_fk', 'offre_id',    'recrutement_offres')
    ) as v(tbl, cname, col, ref)
  loop
    if not exists (
      select 1 from pg_constraint
      where conname = t.cname and conrelid = ('public.' || t.tbl)::regclass
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t.ref
        and column_name = 'id' and data_type = 'uuid'
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (%I) references public.%I(id) on delete cascade',
        t.tbl, t.cname, t.col, t.ref);
    end if;
  end loop;
end$$;

-- Unicité et index
create unique index if not exists rc_meta_uniq  on public.recrutement_candidat_meta (etablissement_id, candidat_id);
create unique index if not exists rc_score_uniq on public.recrutement_scorecard     (etablissement_id, candidat_id, critere);
create unique index if not exists rc_onb_uniq   on public.recrutement_onboarding    (etablissement_id, candidat_id, etape);
create unique index if not exists rc_diff_uniq  on public.recrutement_diffusion     (etablissement_id, offre_id, canal);

create index if not exists rc_offres_etab_idx on public.recrutement_offres        (etablissement_id);
create index if not exists rc_meta_etab_idx   on public.recrutement_candidat_meta (etablissement_id);
create index if not exists rc_score_etab_idx  on public.recrutement_scorecard     (etablissement_id);
create index if not exists rc_onb_etab_idx    on public.recrutement_onboarding    (etablissement_id);
create index if not exists rc_diff_etab_idx   on public.recrutement_diffusion     (etablissement_id);

-- ── RLS : 4 politiques par table, filtrées via public.profiles ───────────
-- Données de recrutement : évaluation de candidats et coûts. Lecture ET
-- écriture réservées aux comptes admin / superadmin / rh du même
-- établissement. Aucun contrôle d'accès existant n'est desserré.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'recrutement_offres',
    'recrutement_candidat_meta',
    'recrutement_scorecard',
    'recrutement_onboarding',
    'recrutement_diffusion'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);

    execute format('drop policy if exists %I on public.%I', tbl || '_select', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_insert', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_update', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_delete', tbl);

    execute format($f$
      create policy %I on public.%I for select to authenticated
      using (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_select', tbl);

    execute format($f$
      create policy %I on public.%I for insert to authenticated
      with check (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_insert', tbl);

    execute format($f$
      create policy %I on public.%I for update to authenticated
      using (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
      with check (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_update', tbl);

    execute format($f$
      create policy %I on public.%I for delete to authenticated
      using (
        etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','superadmin','rh'))
      )
    $f$, tbl || '_delete', tbl);
  end loop;
end$$;

-- ── Déclencheur updated_at ──────────────────────────────────────────────
create or replace function public.recrutement_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'recrutement_offres',
    'recrutement_candidat_meta',
    'recrutement_scorecard',
    'recrutement_onboarding',
    'recrutement_diffusion'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', tbl || '_touch', tbl);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.recrutement_touch_updated_at()',
      tbl || '_touch', tbl);
  end loop;
end$$;
