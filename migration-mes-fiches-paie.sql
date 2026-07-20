-- ══════════════════════════════════════════════════════════════════════
-- INTERNALIS — Mes fiches de paie : demandes d'attestation de salaire
-- Idempotent : exécutable plusieurs fois sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase.
-- ══════════════════════════════════════════════════════════════════════

create table if not exists public.attestations_salaire (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  profile_id        uuid references auth.users(id) on delete set null,
  employe_id        text not null default '',
  employe_nom       text not null default '',
  motif             text not null default 'Attestation de salaire',
  periode_debut     text,
  periode_fin       text,
  commentaire       text not null default '',
  statut            text not null default 'demandee',
  traite_par        text,
  traite_le         timestamptz,
  created_at        timestamptz not null default now()
);

-- Colonnes ajoutées après coup (idempotence sur une table préexistante)
alter table public.attestations_salaire add column if not exists traite_par text;
alter table public.attestations_salaire add column if not exists traite_le  timestamptz;

create index if not exists attestations_salaire_etab_idx
  on public.attestations_salaire (etablissement_id, created_at desc);
create index if not exists attestations_salaire_profile_idx
  on public.attestations_salaire (profile_id);

alter table public.attestations_salaire enable row level security;

-- ── Politiques (filtrées par public.profiles) ─────────────────────────
-- Lecture : tout membre de l'établissement (RH/admin voient les demandes,
-- le salarié voit les siennes ; le filtrage fin se fait côté application).
drop policy if exists attestations_salaire_select on public.attestations_salaire;
create policy attestations_salaire_select on public.attestations_salaire
  for select using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Création : uniquement pour soi, dans son établissement.
drop policy if exists attestations_salaire_insert on public.attestations_salaire;
create policy attestations_salaire_insert on public.attestations_salaire
  for insert with check (
    profile_id = auth.uid()
    and etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Mise à jour : l'auteur (tant que la demande n'est pas traitée) ou un
-- profil admin/RH du même établissement.
drop policy if exists attestations_salaire_update on public.attestations_salaire;
create policy attestations_salaire_update on public.attestations_salaire
  for update using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and (
      profile_id = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
      )
    )
  ) with check (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Suppression : l'auteur ou un profil admin/RH du même établissement.
drop policy if exists attestations_salaire_delete on public.attestations_salaire;
create policy attestations_salaire_delete on public.attestations_salaire
  for delete using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and (
      profile_id = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
      )
    )
  );
