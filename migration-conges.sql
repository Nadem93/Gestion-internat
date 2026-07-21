-- ════════════════════════════════════════════════════════════════════════
-- DEMANDES DE CONGÉS (RH) — règles & quotas de service
--
-- La maquette « Demandes congés (RH) » affiche un bloc « Règles & quotas »
-- (max d'absents simultanés, effectif de nuit garanti, période de fermeture,
-- CP à écouler…) qui n'avait aucune source en base. Cette table le porte.
--
-- Elle sert aussi au calcul du drapeau « Sous-effectif » sur les demandes en
-- attente : sans la règle `max_absents_simultanes`, la page N'AFFICHE AUCUN
-- conflit plutôt que d'en inventer un.
--
-- Les compteurs individuels (CP N-1, CP N, RTT, récup, CET) et les soldes
-- d'équipe viennent de la table `conges_soldes` créée par
-- migration-mes-conges.sql — ce fichier ne la redéfinit pas.
--
-- Idempotent : exécutable plusieurs fois sans erreur.
-- À exécuter dans l'éditeur SQL Supabase. NE PAS exécuter automatiquement.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.conges_regles (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  -- Code technique lu par js/conges-v2.js :
  --   max_absents_simultanes → valeur = nb max d'absents acceptés le même jour
  --   effectif_nuit_min      → valeur = nb minimum de veilleurs
  --   cp_acquis_mois         → valeur = jours de CP acquis par mois et par salarié
  --   fermeture              → valeur_texte = période de fermeture imposée
  --   cp_limite_solde        → valeur_texte = date limite d'écoulement des CP
  code              text not null,
  libelle           text not null default '',
  detail            text not null default '',
  valeur            numeric(6,2),
  valeur_texte      text default '',
  actif             boolean not null default true,
  ordre             integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists conges_regles_uniq
  on public.conges_regles (etablissement_id, code);
create index if not exists conges_regles_actif_idx
  on public.conges_regles (etablissement_id, actif);

alter table public.conges_regles enable row level security;

-- Les quatre politiques sont filtrées par l'établissement du profil connecté.
drop policy if exists conges_regles_select on public.conges_regles;
create policy conges_regles_select on public.conges_regles
  for select to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists conges_regles_insert on public.conges_regles;
create policy conges_regles_insert on public.conges_regles
  for insert to authenticated
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists conges_regles_update on public.conges_regles;
create policy conges_regles_update on public.conges_regles
  for update to authenticated
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

drop policy if exists conges_regles_delete on public.conges_regles;
create policy conges_regles_delete on public.conges_regles
  for delete to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Tant que cette migration n'est pas exécutée, conges.html affiche le bloc
-- « Règles & quotas » vide (console.warn) et ne signale aucun sous-effectif :
-- aucune valeur n'est jamais inventée.
