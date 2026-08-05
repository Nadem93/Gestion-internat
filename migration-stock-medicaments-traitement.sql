-- ════════════════════════════════════════════════════════════════════════
-- STOCK MÉDICAMENTS — lien explicite vers un traitement
-- Ajoute la colonne traitement_id : quand un stock nominatif est relié à un
-- traitement précis d'un résident (r.sante.traitements[].id), chaque prise
-- validée « Donné » / « Confié » décrémente automatiquement ce stock.
-- Idempotent : réexécutable sans erreur. Aucune policy RLS à ajouter
-- (la colonne suit les politiques existantes de stock_medicaments).
-- ════════════════════════════════════════════════════════════════════════

alter table public.stock_medicaments
  add column if not exists traitement_id text;
