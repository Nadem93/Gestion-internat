-- ── Répertoire : mémoriser l'auteur d'un contact ─────────────────────────────
-- Objectif : un éducateur peut AJOUTER un contact partenaire ; il ne peut le
-- MODIFIER que s'il en est l'auteur, et ne peut JAMAIS le SUPPRIMER (réservé aux
-- administrateurs). Ce contrôle s'appuie sur la colonne created_by ci-dessous
-- (renseignée par l'application avec l'identifiant du compte connecté).
--
-- À exécuter une fois dans l'éditeur SQL de Supabase.

alter table public.repertoire
  add column if not exists created_by text;

comment on column public.repertoire.created_by is
  'Compte (session.userId) ayant créé le contact. NULL = contacts créés avant cette migration ou importés : seuls les administrateurs peuvent les modifier/supprimer.';
