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
