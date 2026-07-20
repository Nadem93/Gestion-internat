-- ══════════════════════════════════════════════════════════════════════════
-- Stock de médicaments (panneau « Stock & renouvellements » de la page
-- Distribution des médicaments).
--
-- À exécuter dans l'éditeur SQL de Supabase. Idempotent : ré-exécutable
-- sans risque.
--
-- Un stock peut être collectif (resident_id nul : pharmacie de l'internat)
-- ou nominatif (resident_id renseigné : boîte attribuée à un résident).
-- Le pourcentage restant affiché par l'application vaut quantite /
-- quantite_initiale ; le niveau (Critique / Bas / OK) se déduit de
-- seuil_alerte suivant la convention déjà retenue pour inventaire.seuil_alerte
--   quantite <= seuil_alerte / 2  → Critique
--   quantite <= seuil_alerte      → Bas
--   sinon                         → OK
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.stock_medicaments (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  resident_id       text,
  libelle           text not null,
  quantite          integer not null default 0,
  quantite_initiale integer not null default 0,
  seuil_alerte      integer,
  unite             text,
  date_peremption   date,
  created_at        timestamptz not null default now()
);

-- Colonnes ajoutées après coup si la table existait déjà dans une version
-- antérieure (garde l'exécution idempotente).
alter table public.stock_medicaments add column if not exists resident_id       text;
alter table public.stock_medicaments add column if not exists quantite          integer not null default 0;
alter table public.stock_medicaments add column if not exists quantite_initiale integer not null default 0;
alter table public.stock_medicaments add column if not exists seuil_alerte      integer;
alter table public.stock_medicaments add column if not exists unite             text;
alter table public.stock_medicaments add column if not exists date_peremption   date;
alter table public.stock_medicaments add column if not exists created_at        timestamptz not null default now();

-- Quantités jamais négatives, et quantité initiale cohérente : le pourcentage
-- restant n'a de sens que si quantite_initiale > 0 quand un stock est saisi.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'stock_medicaments_quantites_positives') then
    alter table public.stock_medicaments
      add constraint stock_medicaments_quantites_positives
      check (quantite >= 0 and quantite_initiale >= 0 and (seuil_alerte is null or seuil_alerte >= 0));
  end if;
end $$;

create index if not exists stock_medicaments_etab_idx     on public.stock_medicaments (etablissement_id);
create index if not exists stock_medicaments_resident_idx on public.stock_medicaments (resident_id);

alter table public.stock_medicaments enable row level security;

-- ── POLITIQUES ────────────────────────────────────────────────────────────
-- Lecture : tout le personnel rattaché à l'établissement. Le stock est une
-- information de service, consultée par qui distribue comme par qui commande.
drop policy if exists stock_medicaments_select on public.stock_medicaments;
create policy stock_medicaments_select on public.stock_medicaments
  for select to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = stock_medicaments.etablissement_id));

-- Création : tout le personnel de l'établissement. Celui qui ouvre une boîte
-- doit pouvoir l'enregistrer sans attendre un administrateur.
drop policy if exists stock_medicaments_insert on public.stock_medicaments;
create policy stock_medicaments_insert on public.stock_medicaments
  for insert to authenticated with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = stock_medicaments.etablissement_id));

-- Modification : tout le personnel de l'établissement. Décrémenter la
-- quantité restante est le geste courant de la distribution quotidienne ;
-- le réserver à l'auteur de la ligne rendrait le stock faux dès le lendemain.
drop policy if exists stock_medicaments_update on public.stock_medicaments;
create policy stock_medicaments_update on public.stock_medicaments
  for update to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = stock_medicaments.etablissement_id));

-- Suppression : administrateurs seulement. Retirer une ligne de stock efface
-- une trace de traitement médicamenteux : geste rare, et volontairement
-- réservé à la direction.
drop policy if exists stock_medicaments_delete on public.stock_medicaments;
create policy stock_medicaments_delete on public.stock_medicaments
  for delete to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = stock_medicaments.etablissement_id
        and p.role in ('admin','superadmin')));

comment on table public.stock_medicaments is
  'Stock de médicaments, collectif (resident_id nul) ou nominatif. Lecture et écriture ouvertes au personnel de l''établissement ; suppression réservée aux administrateurs.';
