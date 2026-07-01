-- ════════════════════════════════════════════════════════════════════
--  MIGRATION — Protection juridique (tuteur/curateur) : colonnes manquantes
--  À exécuter dans l'éditeur SQL de Supabase.
--  Bug trouvé le 2026-07-02 : le champ "Tuteur / Curateur" existe dans le
--  formulaire (eProtectionNom) et s'affiche sur la fiche résident, mais
--  n'a jamais été mappé vers une colonne Postgres -- il se perdait
--  silencieusement à chaque sauvegarde. Aucun numéro de téléphone
--  dédié n'existait non plus pour le contacter.
--  Pas de nouvelle policy RLS : residents.etablissement_id + RLS existants
--  s'appliquent déjà à ces nouvelles colonnes.
-- ════════════════════════════════════════════════════════════════════

alter table public.residents
  add column if not exists protection_nom text default '';

alter table public.residents
  add column if not exists protection_tel text default '';
