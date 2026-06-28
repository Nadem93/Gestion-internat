-- ════════════════════════════════════════════════════════════════════
--  MIGRATION — module INTERVENTIONS (maintenance / technique)
--  À exécuter dans l'éditeur SQL de Supabase.
--  Convention projet : etablissement_id en TEXT (= profiles.etablissement_id),
--  RLS par établissement sur les 4 commandes.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.interventions (
  id                  uuid primary key default gen_random_uuid(),
  etablissement_id    text not null,
  lieu                text not null default '',
  description         text not null default '',
  urgence             text not null default 'normale',
  statut              text not null default 'ouverte',
  demande_par         text default '',
  traite_par          text default '',
  date_traitement     timestamptz,
  photo_travaux       text,            -- photo de preuve en base64 (faible volume)
  commentaire_travaux text default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists interventions_etab_idx   on public.interventions (etablissement_id);
create index if not exists interventions_statut_idx on public.interventions (statut);

alter table public.interventions enable row level security;

drop policy if exists interventions_select on public.interventions;
create policy interventions_select on public.interventions for select
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists interventions_insert on public.interventions;
create policy interventions_insert on public.interventions for insert
  with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists interventions_update on public.interventions;
create policy interventions_update on public.interventions for update
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()))
  with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists interventions_delete on public.interventions;
create policy interventions_delete on public.interventions for delete
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
