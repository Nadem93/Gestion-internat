-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Conseil de la Vie Sociale : « Boîte à idées des résidents »
--
-- La maquette « CVS - refonte (bento) » ajoute un bloc « Boîte à idées des
-- résidents » : propositions déposées par les résidents et les familles,
-- nombre de soutiens (votes), auteur et statut d'instruction.
-- Aucune table du dépôt ne portait cette donnée (le CVS tient dans un unique
-- objet jsonb `cvs.data` : membres, séances, résolutions, thématiques).
--
-- Script IDEMPOTENT : peut être rejoué sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Tant qu'il ne l'est pas, la page
-- cvs.html reste pleinement utilisable : la lecture renvoie [] avec un
-- console.warn et l'écriture est refusée par un toast nommant ce fichier.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Table ───────────────────────────────────────────────────────────────
create table if not exists public.cvs_idees (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  texte             text not null default '',
  auteur            text not null default '',
  votes             integer not null default 0,
  statut            text not null default 'nouvelle',
  created_by        uuid default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Colonnes ajoutées après coup (rejeu sur une base déjà créée)
alter table public.cvs_idees add column if not exists auteur text not null default '';
alter table public.cvs_idees add column if not exists votes integer not null default 0;
alter table public.cvs_idees add column if not exists statut text not null default 'nouvelle';
alter table public.cvs_idees add column if not exists created_by uuid default auth.uid();
alter table public.cvs_idees add column if not exists updated_at timestamptz not null default now();

-- Statuts d'instruction autorisés (contrainte posée une seule fois)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cvs_idees_statut_chk'
      and conrelid = 'public.cvs_idees'::regclass
  ) then
    alter table public.cvs_idees
      add constraint cvs_idees_statut_chk
      check (statut in ('nouvelle', 'etude', 'retenue', 'rejetee'));
  end if;
end$$;

-- Un compteur de soutiens ne peut pas être négatif
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cvs_idees_votes_chk'
      and conrelid = 'public.cvs_idees'::regclass
  ) then
    alter table public.cvs_idees
      add constraint cvs_idees_votes_chk check (votes >= 0);
  end if;
end$$;

-- Clé étrangère vers profiles — posée seulement si les types concordent,
-- pour que le script ne casse pas si profiles.id n'était pas en uuid.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cvs_idees_created_by_fk'
      and conrelid = 'public.cvs_idees'::regclass
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.cvs_idees
      add constraint cvs_idees_created_by_fk
      foreign key (created_by) references public.profiles(id) on delete set null;
  end if;
end$$;

create index if not exists cvs_idees_etab_idx on public.cvs_idees (etablissement_id);
create index if not exists cvs_idees_votes_idx on public.cvs_idees (etablissement_id, votes desc);

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table public.cvs_idees enable row level security;

drop policy if exists cvs_idees_select on public.cvs_idees;
drop policy if exists cvs_idees_insert on public.cvs_idees;
drop policy if exists cvs_idees_update on public.cvs_idees;
drop policy if exists cvs_idees_delete on public.cvs_idees;

-- Lecture : tout l'établissement (le CVS est une instance collective)
create policy cvs_idees_select
  on public.cvs_idees for select
  to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid()
              and p.etablissement_id = cvs_idees.etablissement_id)
  );

-- Dépôt d'une proposition : dans son propre établissement
create policy cvs_idees_insert
  on public.cvs_idees for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid()
              and p.etablissement_id = cvs_idees.etablissement_id)
  );

-- Mise à jour : soutenir une proposition (votes) et faire évoluer son statut
-- se font au nom du conseil — tout membre de l'établissement peut le faire.
create policy cvs_idees_update
  on public.cvs_idees for update
  to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid()
              and p.etablissement_id = cvs_idees.etablissement_id)
  )
  with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid()
              and p.etablissement_id = cvs_idees.etablissement_id)
  );

-- Suppression : l'auteur du dépôt, ou l'administration de l'établissement
create policy cvs_idees_delete
  on public.cvs_idees for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid()
              and p.etablissement_id = cvs_idees.etablissement_id
              and (cvs_idees.created_by = auth.uid()
                   or p.role in ('admin', 'superadmin')))
  );
