-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Administration · tables complémentaires
--
-- La page admin.html (design V2) affiche, en plus de ce qui existe déjà :
--   · les agréments & habilitations de l'établissement (onglet Établissement)
--   · le journal des sauvegardes réalisées          (onglet Données)
--   · le registre RGPD / rétention                  (onglet Données)
--
-- Ces trois blocs figurent sur la maquette « Administration (RH) » sans
-- source de données : ce script crée la source. Rien n'est semé ; tant que
-- l'établissement n'a rien saisi, les panneaux restent vides.
--
-- Dégradation douce : si une table est absente, la page la lit comme vide,
-- journalise un console.warn et reste pleinement utilisable ; seules les
-- écritures sont refusées, avec un toast citant ce fichier.
--
-- Script IDEMPOTENT : réexécutable sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1) Agréments & habilitations ─────────────────────────────────────────
-- etat = valide | a_renouveler | expire
create table if not exists public.admin_agrements (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  libelle          text        not null,          -- « Autorisation ARS »
  detail           text,                          -- « FAM — 42 places »
  tag              text,                          -- mention affichée : « Valide 2029 »
  echeance         date,
  etat             text        not null default 'valide',
  ordre            integer     not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists admin_agrements_etab_idx
  on public.admin_agrements (etablissement_id, ordre);

-- ── 2) Journal des sauvegardes ───────────────────────────────────────────
-- statut = ok | partielle | echec
create table if not exists public.admin_sauvegardes (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  faite_le         timestamptz not null default now(),
  type             text        not null default 'automatique',  -- automatique | manuelle | export
  portee           text,                          -- « complète », « journal »…
  taille_octets    bigint,
  statut           text        not null default 'ok',
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists admin_sauvegardes_etab_idx
  on public.admin_sauvegardes (etablissement_id, faite_le desc);

-- ── 3) Registre RGPD / rétention ─────────────────────────────────────────
-- statut = conforme | a_traiter | planifie | non_conforme
create table if not exists public.admin_rgpd_registre (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  libelle          text        not null,          -- « Registre des traitements »
  detail           text,                          -- « 12 traitements documentés »
  statut           text        not null default 'conforme',
  echeance         date,
  ordre            integer     not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists admin_rgpd_registre_etab_idx
  on public.admin_rgpd_registre (etablissement_id, ordre);

-- ══ RLS — cloisonnement par établissement via public.profiles ════════════
alter table public.admin_agrements      enable row level security;
alter table public.admin_sauvegardes    enable row level security;
alter table public.admin_rgpd_registre  enable row level security;

-- 1) admin_agrements
drop policy if exists admin_agrements_select on public.admin_agrements;
create policy admin_agrements_select
  on public.admin_agrements for select
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists admin_agrements_insert on public.admin_agrements;
create policy admin_agrements_insert
  on public.admin_agrements for insert
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists admin_agrements_update on public.admin_agrements;
create policy admin_agrements_update
  on public.admin_agrements for update
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists admin_agrements_delete on public.admin_agrements;
create policy admin_agrements_delete
  on public.admin_agrements for delete
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

-- 2) admin_sauvegardes
drop policy if exists admin_sauvegardes_select on public.admin_sauvegardes;
create policy admin_sauvegardes_select
  on public.admin_sauvegardes for select
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists admin_sauvegardes_insert on public.admin_sauvegardes;
create policy admin_sauvegardes_insert
  on public.admin_sauvegardes for insert
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists admin_sauvegardes_update on public.admin_sauvegardes;
create policy admin_sauvegardes_update
  on public.admin_sauvegardes for update
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists admin_sauvegardes_delete on public.admin_sauvegardes;
create policy admin_sauvegardes_delete
  on public.admin_sauvegardes for delete
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

-- 3) admin_rgpd_registre
drop policy if exists admin_rgpd_registre_select on public.admin_rgpd_registre;
create policy admin_rgpd_registre_select
  on public.admin_rgpd_registre for select
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists admin_rgpd_registre_insert on public.admin_rgpd_registre;
create policy admin_rgpd_registre_insert
  on public.admin_rgpd_registre for insert
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists admin_rgpd_registre_update on public.admin_rgpd_registre;
create policy admin_rgpd_registre_update
  on public.admin_rgpd_registre for update
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()))
  with check (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

drop policy if exists admin_rgpd_registre_delete on public.admin_rgpd_registre;
create policy admin_rgpd_registre_delete
  on public.admin_rgpd_registre for delete
  using (etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid()));

-- ── Horodatage de mise à jour ────────────────────────────────────────────
create or replace function public.admin_extra_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists admin_agrements_touch_trg on public.admin_agrements;
create trigger admin_agrements_touch_trg
  before update on public.admin_agrements
  for each row execute function public.admin_extra_touch();

drop trigger if exists admin_sauvegardes_touch_trg on public.admin_sauvegardes;
create trigger admin_sauvegardes_touch_trg
  before update on public.admin_sauvegardes
  for each row execute function public.admin_extra_touch();

drop trigger if exists admin_rgpd_registre_touch_trg on public.admin_rgpd_registre;
create trigger admin_rgpd_registre_touch_trg
  before update on public.admin_rgpd_registre
  for each row execute function public.admin_extra_touch();
