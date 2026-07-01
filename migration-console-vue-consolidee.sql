-- ════════════════════════════════════════════════════════════════════
--  MIGRATION — Console groupe : Vue consolidée multi-établissements
--  À exécuter dans l'éditeur SQL de Supabase.
--  Portée volontairement réduite (décision utilisateur 2026-07-01) :
--  seule la "Vue consolidée" est migrée. Les autres onglets legacy de
--  console.html (établissements CRUD, utilisateurs, rôles globaux,
--  audit global, sauvegarde/restauration) restent hors périmètre —
--  ils reposaient sur une simulation 100% localStorage antérieure à
--  la migration Supabase (voir js/app.js getEtabs()/getEtabData()).
-- ════════════════════════════════════════════════════════════════════

-- ── Table de métadonnées d'affichage (nom, couleur) des établissements réels ──
-- id = la valeur exacte de profiles.etablissement_id (text). Cette table ne
-- sert qu'à l'affichage dans la console groupe, pas au cloisonnement RLS
-- (qui reste basé sur profiles.etablissement_id partout ailleurs).
create table if not exists public.etablissements (
  id         text primary key,
  nom        text not null default '',
  ville      text default '',
  type       text default '',
  couleur    text not null default '#0f2b4a',
  created_at timestamptz not null default now()
);

alter table public.etablissements enable row level security;

drop policy if exists etablissements_select on public.etablissements;
create policy etablissements_select on public.etablissements for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'));

drop policy if exists etablissements_insert on public.etablissements;
create policy etablissements_insert on public.etablissements for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'));

drop policy if exists etablissements_update on public.etablissements;
create policy etablissements_update on public.etablissements for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'));

drop policy if exists etablissements_delete on public.etablissements;
create policy etablissements_delete on public.etablissements for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'));

-- ── Fonction sécurisée : agrège les indicateurs clés par établissement ──
-- SECURITY DEFINER pour pouvoir lire à travers tous les établissements sans
-- toucher (ni affaiblir) le RLS existant sur residents/incidents/ppe/journal/
-- app_config, qui reste strictement scoping-par-établissement pour tout le
-- reste de l'application. Le contrôle d'accès se fait EN DÉBUT de fonction :
-- seul un profil role='superadmin' peut l'exécuter (sinon exception).
create or replace function public.get_consolidated_stats()
returns table (
  etablissement_id  text,
  nom               text,
  couleur           text,
  residents_actifs  bigint,
  capacite          integer,
  incidents_ouverts bigint,
  avenants_actifs   bigint,
  journal_jour      bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'superadmin'
  ) then
    raise exception 'Accès réservé aux super administrateurs';
  end if;

  return query
  select
    e.id,
    e.nom,
    e.couleur,
    coalesce(r.n, 0)::bigint,
    coalesce((cfg.valeur->>'capacite')::int, 0),
    coalesce(i.n, 0)::bigint,
    coalesce(p.n, 0)::bigint,
    coalesce(j.n, 0)::bigint
  from public.etablissements e
  left join lateral (
    select count(*) as n from public.residents res
    where res.etablissement_id = e.id and coalesce(res.statut, '') <> 'sorti'
  ) r on true
  left join lateral (
    select valeur from public.app_config c
    where c.etablissement_id = e.id and c.cle = 'settings' limit 1
  ) cfg on true
  left join lateral (
    select count(*) as n from public.incidents inc
    where inc.etablissement_id = e.id and inc.statut in ('declare', 'cours')
  ) i on true
  left join lateral (
    select count(*) as n from public.ppe pp
    where pp.etablissement_id = e.id and pp.statut = 'actif'
  ) p on true
  left join lateral (
    select count(*) as n from public.journal jr
    where jr.etablissement_id = e.id and jr.date::date = current_date
  ) j on true
  order by e.nom;
end;
$$;

grant execute on function public.get_consolidated_stats() to authenticated;

-- ── Pense-bête : pour tester cette vue, il faut au moins UN profil superadmin ──
-- update public.profiles set role = 'superadmin' where id = '<uuid-du-compte>';
-- puis ajouter une ligne dans etablissements (id = etablissement_id exact du profil) :
-- insert into public.etablissements (id, nom, couleur) values ('foyer-trois-rivieres', 'Foyer Les Trois Rivières', '#0f2b4a');
