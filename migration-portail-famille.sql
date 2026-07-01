-- ════════════════════════════════════════════════════════════════════
--  MIGRATION — Portail famille (lecture seule)
--  À exécuter dans l'éditeur SQL de Supabase.
--  Portée (décision utilisateur 2026-07-01) : UNIQUEMENT les documents
--  résident explicitement marqués « partageable famille » par le
--  personnel. Pas de planning, pas de visites, pas de transmissions
--  dans ce lot — ces contenus sont rédigés pour un usage professionnel
--  interne et n'ont pas été jugés adaptés à un lectorat familial.
-- ════════════════════════════════════════════════════════════════════

-- ── Un document résident peut être marqué partageable avec la famille (false par défaut) ──
alter table public.documents_resident
  add column if not exists partage_famille boolean not null default false;

-- ── Email sur profiles : nécessaire pour retrouver un compte famille existant depuis
-- l'Edge Function find-famille-account (service_role, ne dépend d'aucune policy RLS).
-- Rempli pour les nouveaux comptes uniquement (create-user modifiée) ; reste NULL pour
-- les profils déjà existants — sans impact, ils ne sont pas concernés par cette recherche.
alter table public.profiles
  add column if not exists email text;

-- ── Table de liaison : quel compte famille voit quel(s) résident(s) ──
-- Un compte famille peut être lié à plusieurs résidents (décision utilisateur).
create table if not exists public.famille_residents (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  resident_id       text not null,
  etablissement_id  text not null,
  created_at        timestamptz not null default now(),
  unique (profile_id, resident_id)
);

create index if not exists famille_residents_profile_idx  on public.famille_residents (profile_id);
create index if not exists famille_residents_resident_idx on public.famille_residents (resident_id);

alter table public.famille_residents enable row level security;

-- Un compte famille voit ses propres liaisons ; le personnel de l'établissement voit/gère les siennes
drop policy if exists famille_residents_select on public.famille_residents;
create policy famille_residents_select on public.famille_residents for select
  using (
    profile_id = auth.uid()
    or etablissement_id = (select etablissement_id from public.profiles where id = auth.uid())
  );

-- Seuls les administrateurs de l'établissement créent/suppriment une liaison
drop policy if exists famille_residents_insert on public.famille_residents;
create policy famille_residents_insert on public.famille_residents for insert
  with check (
    etablissement_id = (select etablissement_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );

drop policy if exists famille_residents_delete on public.famille_residents;
create policy famille_residents_delete on public.famille_residents for delete
  using (
    etablissement_id = (select etablissement_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- ── Policy ADDITIVE sur documents_resident (n'affaiblit aucune policy existante) ──
-- Un compte famille peut lire UNIQUEMENT les documents explicitement partagés
-- pour un résident auquel il est lié. Les policies staff existantes (etablissement)
-- ne sont ni modifiées ni remplacées : celle-ci s'ajoute (OR) pour le rôle famille.
drop policy if exists documents_resident_select_famille on public.documents_resident;
create policy documents_resident_select_famille on public.documents_resident for select
  using (
    partage_famille = true
    and exists (
      select 1 from public.famille_residents fr
      where fr.profile_id = auth.uid() and fr.resident_id = documents_resident.resident_id
    )
  );

-- ── Fonction sécurisée : documents partagés visibles par le compte famille connecté ──
-- SECURITY DEFINER pour ne dépendre d'aucun accès direct à la table residents
-- (qui reste RLS-scopée par établissement pour le personnel uniquement — on ne
-- veut surtout pas qu'un compte famille puisse lister tous les résidents du foyer).
create or replace function public.get_mes_documents_famille()
returns table (
  resident_id    text,
  resident_nom   text,
  document_id    uuid,
  document_name  text,
  fichier_path   text,
  category       text,
  doc_date       date
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'famille'
  ) then
    raise exception 'Accès réservé aux comptes famille';
  end if;

  return query
  select
    r.id::text,
    trim(coalesce(r.prenom, '') || ' ' || coalesce(r.nom, '')),
    d.id,
    d.name,
    d.fichier_path,
    d.category,
    d.doc_date::date
  from public.famille_residents fr
  join public.residents r on r.id::text = fr.resident_id
  join public.documents_resident d
    on d.resident_id = fr.resident_id and d.partage_famille = true
  where fr.profile_id = auth.uid()
  order by r.nom, d.doc_date desc nulls last;
end;
$$;

grant execute on function public.get_mes_documents_famille() to authenticated;

-- ── Pense-bête : le rôle 'famille' est créé via l'Edge Function create-user existante
-- (passer role: 'famille' dans le body) — aucune modification de l'Edge Function requise.
-- Lier ensuite le compte à un résident :
-- insert into public.famille_residents (profile_id, resident_id, etablissement_id)
-- values ('<uuid-du-compte-famille>', '<id-resident>', '<etablissement_id>');
