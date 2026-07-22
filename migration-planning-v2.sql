-- ════════════════════════════════════════════════════════════════════
-- MIGRATION PLANNING V2 — nouvelles fonctionnalités de l'agenda résidents
-- Projet Supabase : udgnbqxabsgcnrtuemca · table : public.planning_events
-- Rejouable : chaque instruction est idempotente (ADD COLUMN IF NOT EXISTS).
-- Tant que ce script n'est pas exécuté, l'app se dégrade proprement :
-- l'enregistrement d'un événement réessaie sans les nouvelles colonnes.
-- ════════════════════════════════════════════════════════════════════

-- 1) Statut de l'événement : prévu / réalisé / annulé / reporté.
--    Sert au suivi (une sortie a-t-elle bien eu lieu ?) et au rapport d'activité.
alter table public.planning_events
  add column if not exists statut text not null default 'prevu';

-- 2) Accompagnant(s) : simple affectation nominative pour une sortie / un RDV.
--    Texte libre (noms séparés par des virgules) — JAMAIS une notation du personnel,
--    ni un créneau de travail au sens du Code du travail.
alter table public.planning_events
  add column if not exists accompagnants text;

-- 3) Pièces jointes de l'événement (convocation, ordonnance du RDV, invitation…).
--    Tableau JSON d'objets { path, name } ; les fichiers vivent dans le bucket
--    privé "justificatifs" (1er dossier = auth.uid() de l'uploadeur, comme partout).
alter table public.planning_events
  add column if not exists pieces_jointes jsonb not null default '[]'::jsonb;

-- Index partiel : retrouver rapidement les événements non « prévus »
-- (réalisés / annulés / reportés) pour le suivi et les statistiques.
create index if not exists idx_planning_events_statut
  on public.planning_events (etablissement_id, statut)
  where statut <> 'prevu';

-- Note RLS : aucune policy à ajouter — ces colonnes suivent les policies
-- existantes de planning_events (scoping etablissement_id via public.profiles).
