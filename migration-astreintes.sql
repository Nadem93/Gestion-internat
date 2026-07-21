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
