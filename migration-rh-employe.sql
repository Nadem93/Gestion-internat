-- ════════════════════════════════════════════════════════════════════════
--  MIGRATION — Sous-modules RH de la fiche employé vers Supabase
--  À exécuter dans Supabase → SQL Editor. Idempotent (create if not exists).
--
--  Remplace les stocks localStorage locaux (non synchronisés entre postes) :
--    ftr_emp_formations, ftr_emp_diplomes, ftr_emp_sanctions,
--    ftr_emp_notes_admin, ftr_emp_historique, ftr_emp_alertes
--
--  Choix de conception : UNE table qui stocke, par (établissement, employé, module),
--  le tableau d'enregistrements en JSONB — mapping 1:1 avec la structure actuelle
--  { employeId: [ ... ] }, donc câblage minimal côté code.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.emp_rh_stores (
  etablissement_id text        not null,
  employe_id       text        not null,
  module           text        not null
    check (module in ('formations','diplomes','sanctions','notes_admin','historique','alertes')),
  records          jsonb       not null default '[]'::jsonb,
  updated_at       timestamptz not null default now(),
  primary key (etablissement_id, employe_id, module)
);

alter table public.emp_rh_stores enable row level security;

-- Accès limité aux membres de l'établissement (même convention que le reste du site :
-- l'établissement de l'utilisateur est lu dans profiles via auth.uid()).
drop policy if exists emp_rh_stores_rw on public.emp_rh_stores;
create policy emp_rh_stores_rw on public.emp_rh_stores
  for all
  using (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  )
  with check (
    etablissement_id = (select p.etablissement_id from public.profiles p where p.id = auth.uid())
  );

-- NOTE SÉCURITÉ : 'sanctions' et 'notes_admin' sont sensibles. La policy ci-dessus
-- les ouvre à tout membre de l'établissement (l'accès fin reste géré par l'UI admin-only).
-- Si tu veux les restreindre côté base aux rôles direction/chef de service, on ajoutera
-- une policy dédiée qui teste un rôle dans profiles — dis-le moi.
