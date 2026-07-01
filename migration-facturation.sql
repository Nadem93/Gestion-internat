-- ════════════════════════════════════════════════════════════════════
--  MIGRATION — module FACTURATION (tarifs + factures)
--  À exécuter dans l'éditeur SQL de Supabase.
--  Convention projet : etablissement_id en TEXT (= profiles.etablissement_id),
--  RLS par établissement sur les 4 commandes.
-- ════════════════════════════════════════════════════════════════════

-- ── TARIFS : un seul objet (catégories + affectations résidents) par établissement ──
create table if not exists public.facturation_tarifs (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null unique,
  data              jsonb not null default '{}'::jsonb,
  updated_at        timestamptz not null default now()
);

alter table public.facturation_tarifs enable row level security;

drop policy if exists facturation_tarifs_select on public.facturation_tarifs;
create policy facturation_tarifs_select on public.facturation_tarifs for select
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists facturation_tarifs_insert on public.facturation_tarifs;
create policy facturation_tarifs_insert on public.facturation_tarifs for insert
  with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists facturation_tarifs_update on public.facturation_tarifs;
create policy facturation_tarifs_update on public.facturation_tarifs for update
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()))
  with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists facturation_tarifs_delete on public.facturation_tarifs;
create policy facturation_tarifs_delete on public.facturation_tarifs for delete
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

-- ── FACTURES : une ligne par résident × période ──
create table if not exists public.factures (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  periode           text not null default '',      -- format 'YYYY-MM'
  resident_id       text,
  resident_nom      text default '',
  organisme         text default '',
  categorie_id      text default '',
  categorie_label   text default '',
  nb_jours          integer not null default 0,
  prix_jour         numeric(10,2) not null default 0,
  montant           numeric(10,2) not null default 0,
  statut            text not null default 'brouillon',
  date_envoi        date,
  date_paiement     date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists factures_etab_idx    on public.factures (etablissement_id);
create index if not exists factures_periode_idx on public.factures (periode);
create index if not exists factures_statut_idx  on public.factures (statut);

alter table public.factures enable row level security;

drop policy if exists factures_select on public.factures;
create policy factures_select on public.factures for select
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists factures_insert on public.factures;
create policy factures_insert on public.factures for insert
  with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists factures_update on public.factures;
create policy factures_update on public.factures for update
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()))
  with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists factures_delete on public.factures;
create policy factures_delete on public.factures for delete
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
