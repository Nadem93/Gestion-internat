-- ══════════════════════════════════════════════════════════════════════════
-- Chambres : date d'attribution + états des lieux à 8 postes
--
-- À exécuter dans l'éditeur SQL de Supabase. Idempotent : ré-exécutable
-- sans risque.
--
-- Ce que fait ce fichier :
--   1. ajoute public.chambres.date_attribution — date à laquelle l'occupant
--      actuel a reçu la chambre. Auparavant l'interface se rabattait sur la
--      date d'entrée du résident dans l'établissement, ce qui était faux dès
--      qu'un résident changeait de chambre ;
--   2. sécurise public.chambres (RLS + 4 politiques) selon le patron du
--      projet : lecture par tout le personnel de l'établissement via
--      public.profiles, écriture ouverte au même périmètre.
--
-- Ce que ce fichier NE fait PAS, volontairement :
--   les 3 postes d'état des lieux ajoutés (fenêtre & volet, électricité /
--   prises, chauffage) n'exigent aucune migration : public.etats_lieux.etat
--   est une colonne jsonb, les nouvelles clés s'y écrivent telles quelles et
--   les relevés anciens, dépourvus de ces clés, s'affichent « Non évalué ».
--   Le bloc de contrôle en fin de fichier se contente de le vérifier.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Date d'attribution ────────────────────────────────────────────────
alter table public.chambres
  add column if not exists date_attribution date;

comment on column public.chambres.date_attribution is
  'Date à laquelle l''occupant actuel a reçu la chambre. Nulle tant qu''elle n''a pas été saisie — l''interface n''affiche alors aucune ancienneté plutôt que d''en déduire une.';

-- ── 2. RLS et politiques sur public.chambres ─────────────────────────────
-- Note : si la table portait déjà des politiques nommées autrement, elles
-- restent en place (les politiques permissives s'additionnent). Les quatre
-- ci-dessous sont nommées chambres_select / _insert / _update / _delete.
alter table public.chambres enable row level security;

-- Lecture : tout compte authentifié rattaché à l'établissement.
drop policy if exists chambres_select on public.chambres;
create policy chambres_select on public.chambres
  for select to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = chambres.etablissement_id));

-- Création : même périmètre. Le plan des chambres est un outil de travail
-- partagé — un éducateur qui installe un résident doit pouvoir créer la
-- chambre manquante. Le filtrage fin (bouton « Nouvelle chambre » masqué)
-- reste applicatif, comme pour les consignes.
drop policy if exists chambres_insert on public.chambres;
create policy chambres_insert on public.chambres
  for insert to authenticated with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = chambres.etablissement_id));

-- Modification : même périmètre. C'est par cette politique que passe
-- l'écriture de date_attribution.
drop policy if exists chambres_update on public.chambres;
create policy chambres_update on public.chambres
  for update to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = chambres.etablissement_id));

-- Suppression : réservée à l'encadrement. Supprimer une chambre vide le
-- champ « chambre » des résidents qui y sont affectés : l'effet dépasse
-- l'auteur du geste, on ne l'ouvre donc pas à tout le personnel.
drop policy if exists chambres_delete on public.chambres;
create policy chambres_delete on public.chambres
  for delete to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = chambres.etablissement_id
        and p.role in ('admin','superadmin')));

-- ── 3. Contrôle : etats_lieux.etat doit être du jsonb ────────────────────
-- Si ce contrôle échoue, les 3 nouveaux postes ne pourront pas être stockés
-- et il faudra convertir la colonne avant d'utiliser la page.
do $$
declare t text;
begin
  select data_type into t from information_schema.columns
    where table_schema = 'public' and table_name = 'etats_lieux' and column_name = 'etat';
  if t is null then
    raise notice 'Table public.etats_lieux absente : la page reste utilisable, l''historique des états des lieux sera vide.';
  elsif t not in ('jsonb', 'json') then
    raise exception 'public.etats_lieux.etat est de type % — les 8 postes exigent du jsonb.', t;
  else
    raise notice 'public.etats_lieux.etat est du % : les 8 postes ne demandent aucune migration.', t;
  end if;
end $$;
