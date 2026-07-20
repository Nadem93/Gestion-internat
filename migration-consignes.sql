-- ══════════════════════════════════════════════════════════════════════════
-- Consignes permanentes (page Transmissions)
--
-- À exécuter UNE FOIS dans l'éditeur SQL de Supabase. Idempotent.
--
-- Nouveauté apportée par la maquette « Transmissions - refonte (bento) » :
-- des consignes affichées en haut de la passation tous les jours, jusqu'à ce
-- qu'un administrateur les retire. Rien d'équivalent n'existait en base.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.consignes (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  texte            text not null default '',
  categorie        text not null default 'autre',   -- soin | securite | direction | autre
  auteur           text not null default '',        -- émetteur affiché (ex. « Consigne infirmerie »)
  created_by       text,                            -- session.userId
  created_at       timestamptz not null default now()
);

create index if not exists consignes_etab_idx
  on public.consignes (etablissement_id, created_at desc);

alter table public.consignes enable row level security;

-- Lecture : tout le personnel de l'établissement.
drop policy if exists consignes_select on public.consignes;
create policy consignes_select on public.consignes
  for select to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = consignes.etablissement_id));

-- Écriture : réservée aux administrateurs (une consigne engage tout le foyer).
drop policy if exists consignes_insert on public.consignes;
create policy consignes_insert on public.consignes
  for insert to authenticated with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = consignes.etablissement_id
        and p.role in ('admin','superadmin')));

drop policy if exists consignes_update on public.consignes;
create policy consignes_update on public.consignes
  for update to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = consignes.etablissement_id
        and p.role in ('admin','superadmin')));

drop policy if exists consignes_delete on public.consignes;
create policy consignes_delete on public.consignes
  for delete to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = consignes.etablissement_id
        and p.role in ('admin','superadmin')));

comment on table public.consignes is
  'Consignes permanentes affichées sur la page Transmissions. Lecture par tout le personnel, écriture réservée aux administrateurs.';
