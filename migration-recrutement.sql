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
