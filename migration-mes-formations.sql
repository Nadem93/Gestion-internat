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
