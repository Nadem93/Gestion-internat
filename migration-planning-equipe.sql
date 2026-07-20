-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Planning équipe · seuils réglementaires (Code du travail)
--
-- Le panneau « Conformité — Code du travail » de planning-equipe.html contrôle
-- automatiquement le planning. Les seuils légaux sont codés en dur côté page
-- (repos quotidien 11 h, repos hebdomadaire 35 h, 10 h/jour, 48 h/semaine…).
-- Cette table permet à un établissement de les AJUSTER (accord d'entreprise,
-- CCN 66, dérogation nuit…) sans toucher au code.
--
-- Dégradation douce : si la table n'existe pas, la page utilise les seuils
-- légaux par défaut, journalise un console.warn et reste pleinement utilisable ;
-- seule la modification d'un seuil est refusée, avec un toast citant ce fichier.
--
-- Script IDEMPOTENT : réexécutable sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Aucune donnée n'est semée : sans
-- ligne, ce sont les seuils légaux par défaut qui s'appliquent.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.planning_regles_travail (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  code             text        not null,   -- repos_quotidien, repos_hebdo, duree_jour…
  seuil            numeric     not null,   -- valeur en heures (ou en nombre pour les règles de comptage)
  actif            boolean     not null default true,
  commentaire      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Un seul seuil par règle et par établissement
create unique index if not exists planning_regles_travail_etab_code_idx
  on public.planning_regles_travail (etablissement_id, code);

create index if not exists planning_regles_travail_etab_idx
  on public.planning_regles_travail (etablissement_id);

alter table public.planning_regles_travail enable row level security;

-- ── Politiques : cloisonnement par établissement via public.profiles ──────
drop policy if exists planning_regles_travail_select on public.planning_regles_travail;
create policy planning_regles_travail_select
  on public.planning_regles_travail for select
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists planning_regles_travail_insert on public.planning_regles_travail;
create policy planning_regles_travail_insert
  on public.planning_regles_travail for insert
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists planning_regles_travail_update on public.planning_regles_travail;
create policy planning_regles_travail_update
  on public.planning_regles_travail for update
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  )
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists planning_regles_travail_delete on public.planning_regles_travail;
create policy planning_regles_travail_delete
  on public.planning_regles_travail for delete
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Horodatage de mise à jour
create or replace function public.planning_regles_travail_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists planning_regles_travail_touch_trg on public.planning_regles_travail;
create trigger planning_regles_travail_touch_trg
  before update on public.planning_regles_travail
  for each row execute function public.planning_regles_travail_touch();
