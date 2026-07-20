-- ══════════════════════════════════════════════════════════════════════════
-- Consignes permanentes : ouverture de la rédaction aux éducateurs
--
-- À exécuter dans l'éditeur SQL de Supabase, APRÈS migration-consignes.sql.
-- Idempotent : ré-exécutable sans risque.
--
-- Change : tout le personnel de l'établissement peut désormais publier une
-- consigne. La suppression suit la règle déjà retenue pour le répertoire —
-- chacun retire ce qu'il a écrit, les administrateurs retirent tout.
-- ══════════════════════════════════════════════════════════════════════════

-- Rédaction : tout compte authentifié rattaché à l'établissement.
drop policy if exists consignes_insert on public.consignes;
create policy consignes_insert on public.consignes
  for insert to authenticated with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = consignes.etablissement_id));

-- Modification : l'auteur, ou un administrateur.
drop policy if exists consignes_update on public.consignes;
create policy consignes_update on public.consignes
  for update to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = consignes.etablissement_id
        and (consignes.created_by = auth.uid()::text
             or p.role in ('admin','superadmin'))));

-- Suppression : idem. Une consigne reste visible de tous, donc on évite qu'un
-- éducateur puisse retirer celle d'un collègue ou de la direction.
drop policy if exists consignes_delete on public.consignes;
create policy consignes_delete on public.consignes
  for delete to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = consignes.etablissement_id
        and (consignes.created_by = auth.uid()::text
             or p.role in ('admin','superadmin'))));

comment on table public.consignes is
  'Consignes permanentes affichées sur la page Transmissions. Rédaction ouverte à tout le personnel ; suppression par l''auteur ou un administrateur.';
