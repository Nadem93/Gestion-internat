-- ══════════════════════════════════════════════════════════════════════════
-- Consignes de veille + état du sommeil (page Cahier de nuit)
--
-- À exécuter UNE FOIS dans l'éditeur SQL de Supabase. Idempotent.
--
-- Apporté par la maquette « Cahier de nuit (vie quotidienne) » :
--   · veille_consignes : consigne permanente attachée à un résident, réaffichée
--     chaque nuit au veilleur jusqu'à ce qu'on la retire (bloc ambre).
--   · sommeil_nuit     : pointage de l'état du sommeil, un état par résident
--                        et par nuit (bloc « Sommeil »).
-- Rien d'équivalent n'existait en base.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. CONSIGNES DE VEILLE ───────────────────────────────────────────────

create table if not exists public.veille_consignes (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  resident_id      text not null,
  texte            text not null default '',
  actif            boolean not null default true,
  created_by       text,                            -- auth.uid() de l'auteur
  created_at       timestamptz not null default now()
);

create index if not exists veille_consignes_etab_idx
  on public.veille_consignes (etablissement_id, actif, created_at desc);
create index if not exists veille_consignes_resident_idx
  on public.veille_consignes (resident_id);

alter table public.veille_consignes enable row level security;

-- Lecture : tout le personnel de l'établissement (le veilleur doit voir les
-- consignes de ses collègues de jour, et réciproquement).
drop policy if exists veille_consignes_select on public.veille_consignes;
create policy veille_consignes_select on public.veille_consignes
  for select to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = veille_consignes.etablissement_id));

-- Rédaction : tout compte authentifié rattaché à l'établissement. Une consigne
-- de veille naît d'une observation de terrain (infirmier, éducateur, veilleur),
-- la réserver aux administrateurs la rendrait inutilisable la nuit.
drop policy if exists veille_consignes_insert on public.veille_consignes;
create policy veille_consignes_insert on public.veille_consignes
  for insert to authenticated with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = veille_consignes.etablissement_id));

-- Modification et retrait : l'auteur, ou un administrateur. Une consigne est
-- lue par tous : on évite qu'un collègue retire celle d'un autre ou de la
-- direction (même règle que les consignes permanentes et le répertoire).
drop policy if exists veille_consignes_update on public.veille_consignes;
create policy veille_consignes_update on public.veille_consignes
  for update to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = veille_consignes.etablissement_id
        and (veille_consignes.created_by = auth.uid()::text
             or p.role in ('admin','superadmin'))));

drop policy if exists veille_consignes_delete on public.veille_consignes;
create policy veille_consignes_delete on public.veille_consignes
  for delete to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = veille_consignes.etablissement_id
        and (veille_consignes.created_by = auth.uid()::text
             or p.role in ('admin','superadmin'))));

comment on table public.veille_consignes is
  'Consignes de veille par résident, affichées chaque nuit sur le cahier de nuit. Rédaction ouverte à tout le personnel ; retrait par l''auteur ou un administrateur.';

-- ── 2. ÉTAT DU SOMMEIL ───────────────────────────────────────────────────

create table if not exists public.sommeil_nuit (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  resident_id      text not null,
  date             date not null,
  etat             text not null default 'calme',   -- calme | agite | reveil | absent
  note             text not null default '',
  created_by       text,                            -- auth.uid() du pointeur
  created_at       timestamptz not null default now()
);

-- Un seul état par résident et par nuit : c'est cette contrainte que vise
-- l'upsert du client (on_conflict resident_id,date).
create unique index if not exists sommeil_nuit_resident_date_uidx
  on public.sommeil_nuit (resident_id, date);
create index if not exists sommeil_nuit_etab_date_idx
  on public.sommeil_nuit (etablissement_id, date);

alter table public.sommeil_nuit enable row level security;

-- Lecture : tout le personnel de l'établissement.
drop policy if exists sommeil_nuit_select on public.sommeil_nuit;
create policy sommeil_nuit_select on public.sommeil_nuit
  for select to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = sommeil_nuit.etablissement_id));

-- Écriture : tout le personnel de l'établissement, y compris sur la ligne d'un
-- collègue. Le pointage du sommeil est un relevé d'équipe corrigé au fil de la
-- nuit (relève, renfort, cadre d'astreinte) : le verrouiller sur l'auteur
-- empêcherait la correction d'un état posé par erreur en début de nuit.
drop policy if exists sommeil_nuit_insert on public.sommeil_nuit;
create policy sommeil_nuit_insert on public.sommeil_nuit
  for insert to authenticated with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = sommeil_nuit.etablissement_id));

drop policy if exists sommeil_nuit_update on public.sommeil_nuit;
create policy sommeil_nuit_update on public.sommeil_nuit
  for update to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = sommeil_nuit.etablissement_id));

drop policy if exists sommeil_nuit_delete on public.sommeil_nuit;
create policy sommeil_nuit_delete on public.sommeil_nuit
  for delete to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = sommeil_nuit.etablissement_id));

comment on table public.sommeil_nuit is
  'État du sommeil par résident et par nuit (calme / agité / réveil / absent). Lecture et pointage par tout le personnel de l''établissement.';
