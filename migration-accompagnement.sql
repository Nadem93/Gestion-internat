-- Ajout « Accompagnement apporté + niveau de soutien » sur les événements d'agenda et les entrées de journal.
-- À exécuter une fois dans Supabase (SQL editor). Supprimer ce fichier après exécution.

alter table public.planning_events add column if not exists accompagnement  text default '';
alter table public.planning_events add column if not exists niveau_soutien   text;

alter table public.journal_entries add column if not exists accompagnement   text default '';
alter table public.journal_entries add column if not exists niveau_soutien    text;
