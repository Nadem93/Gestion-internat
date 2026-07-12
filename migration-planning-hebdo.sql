-- ════════════════════════════════════════════════════════════════════
--  MIGRATION — Semaine type (planning hebdomadaire d'absences récurrentes)
--  À exécuter dans l'éditeur SQL de Supabase.
--  Bug confirmé par la revue adversariale du 2026-07-12 : presences.js
--  (tag 📅 « absence planifiée », présomption « sortie », exclusion de
--  « Tous présents ») et medicaments.js (filtre « Présents seulement »,
--  tag 📅) lisent r.planningHebdo, mais aucune colonne n'existait, le
--  mapper residents-supabase.js ne le transportait pas et aucun
--  formulaire ne l'éditait : toute cette UX était du code mort.
--  Format stocké : { "lundi": { "actif": bool, "label": text,
--  "debut": "HH:MM", "fin": "HH:MM" }, … "dimanche": … }.
--  Pas de nouvelle policy RLS : residents.etablissement_id + RLS
--  existants s'appliquent déjà à cette nouvelle colonne.
-- ════════════════════════════════════════════════════════════════════

alter table public.residents
  add column if not exists planning_hebdo jsonb default '{}'::jsonb;
