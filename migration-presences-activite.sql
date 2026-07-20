-- ══════════════════════════════════════════════════════════════════════════
-- Présences aux séances d'activité éducative
--
-- À exécuter dans l'éditeur SQL de Supabase. Idempotent : ré-exécutable
-- sans risque.
--
-- Jusqu'ici une inscription à une activité ne connaissait que deux états
-- (active / terminée), stockés dans residents.activites (JSON). Impossible
-- donc de savoir qui était réellement là tel mercredi. Cette table trace le
-- pointage d'une SÉANCE : une ligne = un inscrit, une activité, une date.
--
-- Règle d'écriture retenue :
--   • lecture      : tout le personnel de l'établissement ;
--   • insert/update: tout le personnel de l'établissement — pointer une
--     séance est un geste d'équipe quotidien, exactement comme le pointage
--     des présences de l'internat (table presences) ; l'éducateur qui anime
--     n'est pas toujours celui qui a créé la ligne, et un collègue doit
--     pouvoir corriger un statut saisi trop vite ;
--   • delete       : l'auteur de la ligne ou un administrateur — supprimer
--     un pointage efface une trace, on garde donc la même prudence que sur
--     les consignes.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.activite_presences (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  activite_id      text not null,
  resident_id      text not null,
  date             date not null,
  statut           text not null default 'present',
  note             text,
  created_by       text,
  created_at       timestamptz not null default now()
);

-- Un seul pointage par inscrit et par séance : l'upsert côté application
-- s'appuie sur cette contrainte (onConflict).
create unique index if not exists activite_presences_unique
  on public.activite_presences (activite_id, resident_id, date);

-- Lecture d'une séance : filtre activité + date.
create index if not exists activite_presences_seance_idx
  on public.activite_presences (etablissement_id, activite_id, date);

-- Historique d'un résident (fiche résident, bilans).
create index if not exists activite_presences_resident_idx
  on public.activite_presences (etablissement_id, resident_id, date);

-- Statuts autorisés. Contrainte posée seulement si elle n'existe pas encore.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'activite_presences_statut_check'
      and conrelid = 'public.activite_presences'::regclass
  ) then
    alter table public.activite_presences
      add constraint activite_presences_statut_check
      check (statut in ('present', 'excuse', 'absent'));
  end if;
end $$;

alter table public.activite_presences enable row level security;

-- ── POLITIQUES ──────────────────────────────────────────────────────────
-- Consultation : tout compte authentifié rattaché à l'établissement.
drop policy if exists activite_presences_select on public.activite_presences;
create policy activite_presences_select on public.activite_presences
  for select to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = activite_presences.etablissement_id));

-- Pointage : tout le personnel de l'établissement.
drop policy if exists activite_presences_insert on public.activite_presences;
create policy activite_presences_insert on public.activite_presences
  for insert to authenticated with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = activite_presences.etablissement_id));

-- Correction : idem — un collègue doit pouvoir rectifier un statut erroné.
drop policy if exists activite_presences_update on public.activite_presences;
create policy activite_presences_update on public.activite_presences
  for update to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = activite_presences.etablissement_id));

-- Suppression : l'auteur du pointage, ou un administrateur.
drop policy if exists activite_presences_delete on public.activite_presences;
create policy activite_presences_delete on public.activite_presences
  for delete to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = activite_presences.etablissement_id
        and (activite_presences.created_by = auth.uid()::text
             or p.role in ('admin', 'superadmin'))));

comment on table public.activite_presences is
  'Pointage des inscrits à une séance d''activité éducative (présent / excusé / absent). Une ligne = activité + résident + date. Pointage ouvert à tout le personnel de l''établissement ; suppression par l''auteur ou un administrateur.';
