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
