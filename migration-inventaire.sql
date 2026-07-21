-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — « Inventaire & matériel » (pilotage) — design V2
--
-- La maquette « Inventaire (pilotage) » affiche plusieurs blocs qui n'ont
-- aucune source en base aujourd'hui :
--   1. « Niveau / Sous seuil / Réapprovisionnement à commander »
--        → il manque un SEUIL D'ALERTE par article.
--   2. « Valeur du parc » et sa ventilation par catégorie
--        → il manque une VALEUR UNITAIRE par article.
--   3. « Maintenance à prévoir »
--        → il manque une DATE DE PROCHAINE MAINTENANCE (l'existant ne stocke
--          que la dernière maintenance réalisée).
--   4. « Garanties & contrats »
--        → il manque le type et l'échéance de garantie.
--   5. « Derniers mouvements de stock » et « Taux de rotation »
--        → table public.inventaire_mouvements.
--   6. « Inventaire annuel » (comptage physique, écarts)
--        → table public.inventaire_comptages.
--   7. « Fournisseurs »
--        → table public.inventaire_fournisseurs.
--
-- Script IDEMPOTENT : peut être rejoué sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Tant qu'il ne l'est pas, la page
-- reste pleinement utilisable : la lecture renvoie [] (avec un console.warn)
-- et l'écriture est refusée avec un message nommant ce fichier.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ══════════════════════════════════════════════════════════════════════════
-- 1) COLONNES MANQUANTES SUR public.inventaire
-- ══════════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public.inventaire') is not null then
    alter table public.inventaire add column if not exists seuil_alerte          integer;
    alter table public.inventaire add column if not exists valeur_unitaire       numeric(12,2);
    alter table public.inventaire add column if not exists maintenance_prochaine date;
    alter table public.inventaire add column if not exists garantie_type         text;
    alter table public.inventaire add column if not exists garantie_fin          date;
  end if;
end$$;

-- ══════════════════════════════════════════════════════════════════════════
-- 2) MOUVEMENTS DE STOCK (entrées / sorties)
--    Écriture ouverte à tout l'établissement : ce sont les équipes de terrain
--    qui réceptionnent et sortent le matériel.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.inventaire_mouvements (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  article_id        uuid,
  article_nom       text not null default '',
  cat               text,
  delta             integer not null default 0,
  motif             text,
  auteur            text,
  created_at        timestamptz not null default now()
);

alter table public.inventaire_mouvements add column if not exists cat text;

create index if not exists inventaire_mouvements_etab_idx
  on public.inventaire_mouvements (etablissement_id, created_at desc);
create index if not exists inventaire_mouvements_article_idx
  on public.inventaire_mouvements (article_id);

alter table public.inventaire_mouvements enable row level security;

drop policy if exists inventaire_mouvements_select on public.inventaire_mouvements;
drop policy if exists inventaire_mouvements_insert on public.inventaire_mouvements;
drop policy if exists inventaire_mouvements_update on public.inventaire_mouvements;
drop policy if exists inventaire_mouvements_delete on public.inventaire_mouvements;

create policy inventaire_mouvements_select
  on public.inventaire_mouvements for select
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy inventaire_mouvements_insert
  on public.inventaire_mouvements for insert
  to authenticated
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy inventaire_mouvements_update
  on public.inventaire_mouvements for update
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  )
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy inventaire_mouvements_delete
  on public.inventaire_mouvements for delete
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ══════════════════════════════════════════════════════════════════════════
-- 3) COMPTAGE PHYSIQUE ANNUEL
--    Une ligne par article et par exercice : quantité théorique au moment du
--    pointage, quantité comptée, auteur et date.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.inventaire_comptages (
  id                  uuid primary key default gen_random_uuid(),
  etablissement_id    text not null,
  annee               smallint not null,
  article_id          uuid not null,
  quantite_theorique  integer not null default 0,
  quantite_comptee    integer not null default 0,
  compte_par          text,
  compte_le           timestamptz not null default now()
);

create unique index if not exists inventaire_comptages_uniq
  on public.inventaire_comptages (etablissement_id, annee, article_id);

alter table public.inventaire_comptages enable row level security;

drop policy if exists inventaire_comptages_select on public.inventaire_comptages;
drop policy if exists inventaire_comptages_insert on public.inventaire_comptages;
drop policy if exists inventaire_comptages_update on public.inventaire_comptages;
drop policy if exists inventaire_comptages_delete on public.inventaire_comptages;

create policy inventaire_comptages_select
  on public.inventaire_comptages for select
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy inventaire_comptages_insert
  on public.inventaire_comptages for insert
  to authenticated
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy inventaire_comptages_update
  on public.inventaire_comptages for update
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  )
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy inventaire_comptages_delete
  on public.inventaire_comptages for delete
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ══════════════════════════════════════════════════════════════════════════
-- 4) FOURNISSEURS (référencement, spécialité, délai de livraison)
--    Écriture réservée aux administrateurs.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.inventaire_fournisseurs (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  nom               text not null,
  specialite        text,
  delai             text,
  contact           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.inventaire_fournisseurs add column if not exists contact text;
alter table public.inventaire_fournisseurs add column if not exists updated_at timestamptz not null default now();

create index if not exists inventaire_fournisseurs_etab_idx
  on public.inventaire_fournisseurs (etablissement_id);

alter table public.inventaire_fournisseurs enable row level security;

drop policy if exists inventaire_fournisseurs_select on public.inventaire_fournisseurs;
drop policy if exists inventaire_fournisseurs_insert on public.inventaire_fournisseurs;
drop policy if exists inventaire_fournisseurs_update on public.inventaire_fournisseurs;
drop policy if exists inventaire_fournisseurs_delete on public.inventaire_fournisseurs;

create policy inventaire_fournisseurs_select
  on public.inventaire_fournisseurs for select
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

create policy inventaire_fournisseurs_insert
  on public.inventaire_fournisseurs for insert
  to authenticated
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy inventaire_fournisseurs_update
  on public.inventaire_fournisseurs for update
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy inventaire_fournisseurs_delete
  on public.inventaire_fournisseurs for delete
  to authenticated
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
