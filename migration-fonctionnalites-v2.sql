-- ══════════════════════════════════════════════════════════════════════════
-- MIGRATION — Fonctionnalités V2 (lot unique à exécuter en une fois)
-- ──────────────────────────────────────────────────────────────────────────
-- Rejouable sans risque : create table if not exists, drop policy if exists
-- avant create policy. Aucun INSERT/DELETE de données.
--
-- Objet : journal d'audit CENTRALISÉ pour la traçabilité RGPD.
-- Avant, auditLog() n'écrivait que dans le localStorage du navigateur : la
-- trace était locale, non partagée, perdue au nettoyage — inexploitable pour
-- une obligation de traçabilité. Cette table la rend durable, partagée par
-- l'établissement, et consultable par dossier (« qui a consulté ce résident »).
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.audit_log (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  ts               timestamptz not null default now(),
  user_id          text,
  user_name        text,
  role             text,
  action           text        not null,
  details          text,
  resident_id      uuid                          -- renseigné pour un accès/écriture lié à un dossier
);

-- Index : consultation par dossier, et affichage chronologique par établissement.
create index if not exists audit_log_resident_idx on public.audit_log (resident_id);
create index if not exists audit_log_etab_ts_idx  on public.audit_log (etablissement_id, ts desc);

alter table public.audit_log enable row level security;

-- Lecture : réservée aux membres de l'établissement (le filtrage « admin
-- uniquement » est fait dans l'interface, comme pour la carte RGPD existante).
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select
  on public.audit_log for select
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Écriture : un membre ne journalise que dans son propre établissement.
drop policy if exists audit_log_insert on public.audit_log;
create policy audit_log_insert
  on public.audit_log for insert
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Volontairement AUCUNE politique UPDATE ni DELETE : un journal d'audit ne se
-- modifie pas. RLS étant actif, l'absence de politique interdit ces opérations.


-- ══════════════════════════════════════════════════════════════════════════
-- TRANSMISSIONS — suivi « à faire pour la relève »
-- ──────────────────────────────────────────────────────────────────────────
-- Une transmission peut porter une action à faire par la vacation suivante ;
-- elle reste ouverte (et se reporte à l'écran) jusqu'à ce qu'on la coche.
-- Colonnes ajoutées de façon idempotente ; RLS de la table `transmissions`
-- inchangée. Tant que ces colonnes n'existent pas, l'app se dégrade toute
-- seule (elle enregistre la transmission sans le suivi).
-- ══════════════════════════════════════════════════════════════════════════

alter table public.transmissions add column if not exists suivi       boolean     not null default false;
alter table public.transmissions add column if not exists suivi_fait  boolean     not null default false;
alter table public.transmissions add column if not exists suivi_par   text;
alter table public.transmissions add column if not exists suivi_le    timestamptz;

-- Index partiel : retrouver vite les actions encore ouvertes.
create index if not exists transmissions_suivi_ouvert_idx
  on public.transmissions (etablissement_id)
  where suivi = true and suivi_fait = false;
