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
