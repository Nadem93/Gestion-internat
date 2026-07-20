-- ══════════════════════════════════════════════════════════════════════════
-- Anonymisation d'un résident : réservée aux administrateurs, côté serveur
--
-- À exécuter UNE FOIS dans l'éditeur SQL de Supabase.
-- Idempotent : ré-exécutable sans risque.
--
-- Contexte : masquer la carte « RGPD / Données » dans l'interface empêche un
-- éducateur de CLIQUER sur « Anonymiser », mais rien ne l'empêche d'appeler la
-- fonction depuis la console du navigateur. Ce fichier déplace l'opération
-- côté base, où le rôle du compte est vérifié pour de bon.
--
-- ⚠️ PORTÉE EXACTE — à lire avant d'exécuter
-- Ceci verrouille LA FONCTION d'anonymisation, pas l'édition d'une fiche.
-- Dans l'application, canEditResident() autorise tout le personnel (sauf les
-- comptes « famille ») à modifier n'importe quel champ d'un résident. Un
-- éducateur peut donc toujours vider les champs un par un via le formulaire.
-- Si ce n'est pas voulu, c'est le modèle de droits d'ÉDITION qu'il faut revoir,
-- et c'est une décision séparée.
-- ══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────
-- 1) Le compte courant est-il administrateur ?
--
--    NOTE : côté client, Auth.isAdmin() est vrai aussi pour un compte ayant la
--    permission « access_admin » sans le rôle admin. Cette table de permissions
--    n'existe pas en base : le contrôle SQL se fonde donc uniquement sur
--    profiles.role. Un compte « éducateur » à qui l'on aurait accordé
--    access_admin sera refusé ici — volontairement, c'est le sens prudent.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'superadmin')
  );
$$;

comment on function public.est_admin() is
  'Vrai si le compte connecté a le rôle admin ou superadmin dans profiles.';


-- ─────────────────────────────────────────────────────────────────────────
-- 2) Anonymisation : efface les données identifiantes, conserve le reste
--
--    Champs conservés volontairement : sante, sorties, trousseau, activites,
--    budget, objectifs, objectifs_suivi, evaluations, regime, planning_hebdo,
--    presences… Le suivi et les statistiques restent exploitables, mais la
--    personne n'est plus identifiable.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.anonymiser_resident(p_id uuid)
returns public.residents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.residents;
  v_etab text;
begin
  if not public.est_admin() then
    raise exception 'Seul un administrateur peut anonymiser un résident.'
      using errcode = '42501';
  end if;

  -- Un admin reste cantonné à son établissement.
  select p.etablissement_id into v_etab
  from public.profiles p where p.id = auth.uid();

  update public.residents r
     set nom             = 'Anonyme',
         prenom          = 'Résident',
         photo           = '',
         notes           = '',
         contacts        = '',
         medecin         = '',
         medecin_tel     = '',
         allergies       = '',
         nss             = '',
         ins             = '',
         dmp             = '',
         dmp_date        = null,
         tuteur          = '',
         tuteur_tel      = '',
         ecole           = '',
         classe          = '',
         organisme       = '',
         dossier         = '',
         organisme_a     = '',
         dossier_a       = '',
         protection_nom  = '',
         protection_tel  = '',
         droits_visite   = '[]'::jsonb,
         color           = '#94a3b8',
         consent         = 'non',
         updated_at      = now()
   where r.id = p_id
     and r.etablissement_id = v_etab
  returning r.* into v_row;

  if v_row.id is null then
    raise exception 'Résident introuvable dans votre établissement (id=%).', p_id
      using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

comment on function public.anonymiser_resident(uuid) is
  'Efface les données identifiantes d''un résident. Réservé aux administrateurs de l''établissement. Irréversible.';


-- ─────────────────────────────────────────────────────────────────────────
-- 3) Qui peut appeler la fonction
--    Le contrôle réel est dans le corps ; on retire quand même l''accès aux
--    rôles non authentifiés pour ne pas l''exposer inutilement.
-- ─────────────────────────────────────────────────────────────────────────
revoke all on function public.anonymiser_resident(uuid) from public, anon;
grant execute on function public.anonymiser_resident(uuid) to authenticated;

revoke all on function public.est_admin() from public, anon;
grant execute on function public.est_admin() to authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 4) Contrôle après exécution — doit renvoyer les deux fonctions
-- ─────────────────────────────────────────────────────────────────────────
-- select p.proname, pg_get_function_identity_arguments(p.oid) as args
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.proname in ('est_admin', 'anonymiser_resident');

-- Pour vérifier au passage les politiques RLS en place sur residents :
-- select policyname, cmd, permissive, qual, with_check
--   from pg_policies where schemaname = 'public' and tablename = 'residents';
