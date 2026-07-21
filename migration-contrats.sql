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
