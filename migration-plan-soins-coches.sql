-- ════════════════════════════════════════════════════════════════════════
--  MIGRATION — Coches « fait » du plan de soins (traçabilité)
--  À exécuter dans Supabase → SQL Editor. Idempotent (create if not exists).
--
--  Une ligne = un soin marqué « fait » un jour donné, avec QUI l'a coché et QUAND.
--  Clé (soin_id, date) : un soin est fait ou non pour une date → historique par jour.
--  Remplace l'ancienne colonne plan_soins.fait_le (qui ne gardait qu'une date, sans
--  auteur ni historique).
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.plan_soins_coches (
  soin_id          text        not null,   -- id du soin (plan_soins.id)
  date             date        not null,   -- jour concerné
  par              text        default '', -- nom de l'auteur de la coche
  par_id           text        default '', -- id du compte auteur
  done_at          timestamptz not null default now(),
  etablissement_id text        not null,
  primary key (soin_id, date)
);

alter table public.plan_soins_coches enable row level security;

-- Accès limité aux membres de l'établissement (même convention que le reste du site :
-- l'établissement de l'utilisateur est lu dans profiles via auth.uid()).
drop policy if exists plan_soins_coches_rw on public.plan_soins_coches;
create policy plan_soins_coches_rw on public.plan_soins_coches
  for all
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  )
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

-- La colonne plan_soins.fait_le n'est plus utilisée (remplacée par cette table).
-- Tu peux la retirer si tu veux (facultatif) :
--   alter table public.plan_soins drop column if exists fait_le;
