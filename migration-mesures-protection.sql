-- ════════════════════════════════════════════════════════════════════
--  MIGRATION — MESURES DE PROTECTION JURIDIQUE (par résident)
--  À exécuter UNE FOIS dans l'éditeur SQL de Supabase.
--  Convention projet : etablissement_id en TEXT (= profiles.etablissement_id),
--  RLS par établissement sur les 4 commandes.
--  Complète les champs plats existants (residents.protection*) par
--  l'historique + les dates de jugement / renouvellement / audience.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.mesures_protection (
  id                    uuid primary key default gen_random_uuid(),
  etablissement_id      text not null,
  resident_id           uuid not null,
  type                  text not null default 'tutelle',   -- tutelle|curatelle|sauvegarde|habilitation|masp|autre
  mandataire_nom        text default '',
  mandataire_organisme  text default '',                   -- UDAF, association tutélaire, mandataire privé…
  mandataire_tel        text default '',
  mandataire_email      text default '',
  tribunal              text default '',                   -- tribunal judiciaire compétent
  date_jugement         date,
  date_debut            date,                              -- date d'effet
  date_renouvellement   date,                              -- échéance -> alerte automatique
  date_audience         date,                              -- prochaine audience
  statut                text not null default 'active',    -- active|terminee
  notes                 text default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists mesures_protection_etab_idx     on public.mesures_protection (etablissement_id);
create index if not exists mesures_protection_resident_idx on public.mesures_protection (resident_id);

alter table public.mesures_protection enable row level security;

drop policy if exists mesures_protection_select on public.mesures_protection;
create policy mesures_protection_select on public.mesures_protection for select
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists mesures_protection_insert on public.mesures_protection;
create policy mesures_protection_insert on public.mesures_protection for insert
  with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists mesures_protection_update on public.mesures_protection;
create policy mesures_protection_update on public.mesures_protection for update
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()))
  with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists mesures_protection_delete on public.mesures_protection;
create policy mesures_protection_delete on public.mesures_protection for delete
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
