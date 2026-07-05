-- ═══════════════════════════════════════════════════════════════════
--  MIGRATION SÉCURITÉ & COHÉRENCE — audit du 2026-07-06
--  À exécuter dans Supabase → SQL Editor AVANT de recharger / redéployer.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1) PERTE DE DONNÉE (critique + élevé) : colonnes jsonb manquantes
--    Le régime alimentaire (allergies/texture) et les droits de visite
--    étaient saisis dans l'UI mais jamais persistés (clé absente du mapper).
--    Sans ces colonnes, l'enregistrement d'un résident échouerait (PGRST204),
--    donc ce bloc DOIT tourner avant que le nouveau code ne soit en ligne.
-- ───────────────────────────────────────────────────────────────────
alter table public.residents add column if not exists regime        jsonb default '{}'::jsonb;
alter table public.residents add column if not exists droits_visite jsonb default '[]'::jsonb;

-- ───────────────────────────────────────────────────────────────────
-- 2) DURCISSEMENT RLS : famille_residents (contrôle d'accès)
--    Cette table est l'UNIQUE source d'autorisation de l'Edge Function
--    get-shared-document-url. Si un compte "famille" peut y insérer ses
--    propres lignes, il peut se lier à n'importe quel résident et lire
--    ses documents partagés. L'INSERT/UPDATE/DELETE doit être réservé
--    aux administrateurs du MÊME établissement ; la famille garde la
--    lecture de ses seules liaisons.
--
--    ⚠️ Adaptez les noms de policies si les vôtres diffèrent (voir
--       Supabase → Authentication → Policies → famille_residents).
-- ───────────────────────────────────────────────────────────────────
alter table public.famille_residents enable row level security;

-- Lecture : une famille voit ses propres liaisons ; un admin voit celles de son établissement.
drop policy if exists famille_residents_select on public.famille_residents;
create policy famille_residents_select on public.famille_residents
  for select using (
    profile_id = auth.uid()
    or etablissement_id = (select etablissement_id from public.profiles where id = auth.uid())
       and (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Écriture (insert / update / delete) : administrateurs du même établissement UNIQUEMENT.
drop policy if exists famille_residents_insert on public.famille_residents;
create policy famille_residents_insert on public.famille_residents
  for insert with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    and etablissement_id = (select etablissement_id from public.profiles where id = auth.uid())
  );

drop policy if exists famille_residents_update on public.famille_residents;
create policy famille_residents_update on public.famille_residents
  for update using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    and etablissement_id = (select etablissement_id from public.profiles where id = auth.uid())
  );

drop policy if exists famille_residents_delete on public.famille_residents;
create policy famille_residents_delete on public.famille_residents
  for delete using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    and etablissement_id = (select etablissement_id from public.profiles where id = auth.uid())
  );

-- ───────────────────────────────────────────────────────────────────
-- Vérification rapide après exécution :
--   select column_name from information_schema.columns
--   where table_name = 'residents' and column_name in ('regime','droits_visite');
--   -- doit renvoyer 2 lignes.
-- ───────────────────────────────────────────────────────────────────
