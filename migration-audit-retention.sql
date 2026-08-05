-- ════════════════════════════════════════════════════════════════════════════
--  RÉTENTION DU JOURNAL D'AUDIT — 6 MOIS
--  À exécuter une fois dans Supabase → SQL Editor.
--
--  Pourquoi : public.audit_log enregistre qui a consulté ou modifié quel
--  dossier. C'est une donnée personnelle qui concerne à la fois le salarié et
--  le résident. Le RGPD (art. 5.1.e) interdit de la conserver au-delà de son
--  utilité ; la durée retenue par le responsable de traitement est de 6 MOIS.
--  Sans purge, la seule limite était la croissance de la table — c'est-à-dire
--  aucune.
--
--  Ce script est idempotent : on peut le rejouer sans risque.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Index sur l'horodatage ───────────────────────────────────────────────
-- La purge, l'affichage et l'export trient ou filtrent sur ts. Sans index,
-- chaque passage relit toute la table.
create index if not exists audit_log_ts_idx on public.audit_log (ts desc);

-- ── 2. Fonction de purge ────────────────────────────────────────────────────
-- La durée est lue dans public.app_config (clé « retention_audit_mois »),
-- ÉTABLISSEMENT PAR ÉTABLISSEMENT : app_config est multi-tenant, chaque
-- responsable de traitement fixe sa propre durée. Repli sur 6 mois si la clé
-- est absente ou hors bornes.
--
-- SECURITY DEFINER : la tâche planifiée s'exécute sans session utilisateur,
-- donc sans le contexte auth.uid() dont dépendent les politiques RLS.
create or replace function public.purger_audit_log()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_etabs  text[];
  v_etab   text;
  v_mois   integer;
  v_n      integer;
  v_total  integer := 0;
begin
  -- Matérialisé d'abord : on supprime dans la table qu'on parcourt.
  select coalesce(array_agg(distinct etablissement_id), '{}')
    into v_etabs
    from public.audit_log;

  foreach v_etab in array v_etabs loop
    -- valeur::text couvre les deux cas (colonne texte ou jsonb « "6" »).
    select nullif(regexp_replace(coalesce(c.valeur::text, ''), '\D', '', 'g'), '')::integer
      into v_mois
      from public.app_config c
     where c.etablissement_id = v_etab
       and c.cle = 'retention_audit_mois'
     limit 1;

    if v_mois is null or v_mois < 1 or v_mois > 24 then
      v_mois := 6;
    end if;

    delete from public.audit_log
     where etablissement_id = v_etab
       and ts < now() - make_interval(months => v_mois);
    get diagnostics v_n = row_count;

    -- La purge est elle-même un traitement : on en garde la trace. Écrite
    -- APRÈS la suppression, elle est postérieure à la limite et survit donc
    -- à sa propre purge pendant toute la durée de conservation.
    if v_n > 0 then
      insert into public.audit_log (etablissement_id, action, details, user_name, role)
      values (v_etab, 'rgpd',
              'Purge automatique du journal d''audit — ' || v_n
                || ' entrée(s) de plus de ' || v_mois || ' mois',
              'Système', 'systeme');
      v_total := v_total + v_n;
    end if;
  end loop;

  return v_total;
end;
$$;

comment on function public.purger_audit_log() is
  'Supprime les entrées de audit_log au-delà de la durée de conservation propre à chaque établissement (app_config.retention_audit_mois, 6 mois par défaut). Renvoie le nombre total de lignes supprimées.';

-- Réservée à la tâche planifiée : l'écran Administration purge par un DELETE
-- ordinaire, soumis aux politiques RLS de l'utilisateur connecté.
revoke all on function public.purger_audit_log() from public, anon, authenticated;

-- ── 3. Planification quotidienne ────────────────────────────────────────────
-- Horaire en UTC : 03:15 UTC = 04:15 (hiver) ou 05:15 (été) en France.
-- ⚠️ L'éditeur SQL exécute tout le script dans UNE transaction : si pg_cron
-- n'est pas activable sur le projet, cette section échoue et ANNULE aussi
-- l'index et la fonction ci-dessus. Dans ce cas, rejouez les sections 1 et 2
-- seules — la purge reste alors déclenchable à la main depuis Administration.
create extension if not exists pg_cron with schema cron;

select cron.unschedule('purge-audit-log')
 where exists (select 1 from cron.job where jobname = 'purge-audit-log');

select cron.schedule(
  'purge-audit-log',
  '15 3 * * *',
  $$select public.purger_audit_log();$$
);

-- ── 3 bis. Politique DELETE — indispensable au bouton « Purger maintenant » ──
-- Le bouton de l'écran Administration fait un DELETE ordinaire, soumis à la
-- RLS. Si audit_log n'a aucune politique DELETE, PostgREST répond 200 avec un
-- tableau vide : le bouton dirait « 0 entrée supprimée » sans rien signaler,
-- et on croirait la purge faite. Contrôle :
--
--   select policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename = 'audit_log';
--
-- Si aucune ligne avec cmd = 'DELETE' n'apparaît, poser celle-ci :
--
--   create policy audit_log_delete on public.audit_log for delete
--     using (
--       etablissement_id = (select etablissement_id from public.profiles where id = auth.uid())
--       and (select role from public.profiles where id = auth.uid()) in ('admin', 'superadmin')
--     );
--
-- La purge planifiée, elle, n'en dépend pas : purger_audit_log() est en
-- SECURITY DEFINER et contourne la RLS.

-- ── 4. À ÉTUDIER : restreindre la LECTURE du journal ────────────────────────
-- ⚠️ NON EXÉCUTÉ ICI, VOLONTAIREMENT — à faire après avoir relu les politiques
-- déjà en place, sans quoi on risque de casser l'écriture des 97 points de
-- traçage ou l'historique affiché sur la fiche résident.
--
-- Constat : la RLS de audit_log restreint à l'établissement, donc TOUT salarié
-- connecté peut, via l'API, lire l'activité de ses collègues — c'est-à-dire
-- quels dossiers de résidents ils ont consultés. Côté application c'est bloqué
-- (employe.html réserve la section aux RH et à la personne concernée), mais
-- une garde côté client n'est pas une mesure de sécurité : elle se contourne.
--
-- Pour voir l'existant :
--   select policyname, cmd, qual from pg_policies
--    where schemaname = 'public' and tablename = 'audit_log';
--
-- Forme recommandée de la politique de LECTURE (à adapter à l'existant) :
--
--   drop policy if exists audit_log_select on public.audit_log;
--   create policy audit_log_select on public.audit_log for select
--     using (
--       etablissement_id = (select etablissement_id from public.profiles where id = auth.uid())
--       and (
--         -- administration : accès complet
--         (select role from public.profiles where id = auth.uid()) in ('admin', 'moderator')
--         -- chacun voit sa propre activité
--         or user_id = auth.uid()::text
--       )
--     );
--
-- ⚠️ Vérifier AVANT d'appliquer : resident.html affiche l'historique d'un
-- dossier (sbGetAuditForResident) à tout utilisateur ayant accès au dossier.
-- La politique ci-dessus le supprimerait pour les non-administrateurs. Si cet
-- historique doit rester visible, ajouter une branche « resident_id is not null
-- and <permission d'accès au dossier> ».

-- ── 5. Contrôle ─────────────────────────────────────────────────────────────
-- Après exécution, ces requêtes doivent répondre :
--
--   select jobname, schedule, active from cron.job where jobname = 'purge-audit-log';
--   select count(*) from public.audit_log where ts < now() - interval '6 months';
--
-- La seconde doit tomber à 0 au lendemain de la première exécution — ou tout
-- de suite via Administration → Données → Dossiers arrivés à échéance →
-- « Purger maintenant ».
--
-- Pour purger immédiatement depuis le SQL Editor :
--   select public.purger_audit_log();
