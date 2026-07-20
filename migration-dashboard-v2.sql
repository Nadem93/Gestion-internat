-- ══════════════════════════════════════════════════════════════════════════
-- Dashboard V2 — vague 2 : ce qui manque réellement en base
--
-- À exécuter UNE FOIS dans l'éditeur SQL de Supabase.
-- Idempotent : ré-exécutable sans risque.
--
-- Périmètre volontairement réduit : après vérification du schéma existant,
-- la plupart des « manques » relevés par l'inventaire n'en étaient pas —
--   • chambres.unite et chambres.capacite      → existent déjà
--   • échéances d'établissement (sans résident) → déjà possibles (resident_id nul)
--   • inventaire.quantite                       → existe déjà
--   • véhicules                                 → stockés en JSON dans app_config, pas en table
-- Il ne reste donc qu'UNE colonne et DEUX tables.
-- ══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────
-- 1) Inventaire : seuil d'alerte de réapprovisionnement
--    Alimente la carte « Stocks à réapprovisionner » (Critique / Bas / OK).
-- ─────────────────────────────────────────────────────────────────────────
alter table public.inventaire
  add column if not exists seuil_alerte integer;

comment on column public.inventaire.seuil_alerte is
  'Quantité plancher déclenchant une alerte. NULL = article non suivi en stock. Convention applicative : Critique si quantite <= seuil_alerte/2, Bas si quantite <= seuil_alerte, sinon OK.';


-- ─────────────────────────────────────────────────────────────────────────
-- 2) Annonces internes (communication institutionnelle)
--    Alimente la carte « Annonces internes » du dashboard.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.annonces (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  titre            text not null default '',
  texte            text not null default '',
  service          text not null default '',          -- Direction, RH, Soins, Cuisine…
  auteur           text not null default '',          -- nom affiché
  created_by       text,                              -- session.userId, pour l'édition par l'auteur
  date_pub         date not null default current_date,
  epingle          boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists annonces_etab_date_idx
  on public.annonces (etablissement_id, epingle desc, date_pub desc);

alter table public.annonces enable row level security;

drop policy if exists annonces_select on public.annonces;
create policy annonces_select on public.annonces
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = annonces.etablissement_id
    )
  );

drop policy if exists annonces_insert on public.annonces;
create policy annonces_insert on public.annonces
  for insert to authenticated with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = annonces.etablissement_id
    )
  );

drop policy if exists annonces_update on public.annonces;
create policy annonces_update on public.annonces
  for update to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = annonces.etablissement_id
    )
  );

drop policy if exists annonces_delete on public.annonces;
create policy annonces_delete on public.annonces
  for delete to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = annonces.etablissement_id
    )
  );


-- ─────────────────────────────────────────────────────────────────────────
-- 3) Climat par unité — « Météo du foyer »
--    Une ligne par (date, unité). Alimente la heatmap 7 jours du dashboard.
--    Les unités reprennent chambres.unite : aucune table d'unités à créer.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.climat_unite (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  date             date not null default current_date,
  unite            text not null default '',
  niveau           text not null default 'calme'
                     check (niveau in ('calme', 'tendu', 'difficile')),
  note             text not null default '',
  saisi_par        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (etablissement_id, date, unite)
);

create index if not exists climat_unite_etab_date_idx
  on public.climat_unite (etablissement_id, date desc);

alter table public.climat_unite enable row level security;

drop policy if exists climat_unite_select on public.climat_unite;
create policy climat_unite_select on public.climat_unite
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = climat_unite.etablissement_id
    )
  );

drop policy if exists climat_unite_insert on public.climat_unite;
create policy climat_unite_insert on public.climat_unite
  for insert to authenticated with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = climat_unite.etablissement_id
    )
  );

drop policy if exists climat_unite_update on public.climat_unite;
create policy climat_unite_update on public.climat_unite
  for update to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = climat_unite.etablissement_id
    )
  );

drop policy if exists climat_unite_delete on public.climat_unite;
create policy climat_unite_delete on public.climat_unite
  for delete to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = climat_unite.etablissement_id
    )
  );


-- ─────────────────────────────────────────────────────────────────────────
-- Vérification rapide (facultatif)
-- ─────────────────────────────────────────────────────────────────────────
-- select column_name from information_schema.columns
--   where table_name = 'inventaire' and column_name = 'seuil_alerte';
-- select count(*) from public.annonces;
-- select count(*) from public.climat_unite;
