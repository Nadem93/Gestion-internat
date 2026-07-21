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
