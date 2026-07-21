-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Absences & accidents du travail (design V2)
--
-- La page absences.html affiche trois panneaux qui n'avaient aucune source en
-- base. Ce script crée les tables correspondantes :
--
--   1. absences_at_etapes  → « Déclaration AT » : avancement de la procédure
--                            légale (constat, certificat initial, CERFA/DAT,
--                            feuille d'accident IJSS).
--   2. absences_impact     → « Impact planning » : postes découverts par une
--                            absence et mode de couverture.
--   3. absences_couts      → « Coût des absences » : maintien de salaire, coût
--                            des remplacements, IJSS récupérées.
--
-- Dégradation douce déjà codée côté page : si une table n'existe pas, la
-- lecture renvoie [] avec un console.warn, le panneau affiche un état vide
-- citant ce fichier, l'écriture est refusée par un toast, et le reste de la
-- page (tableau, registre AT, taux d'absentéisme, Bradford…) reste utilisable.
-- Aucune valeur n'est inventée : sans ligne, la page affiche « — ».
--
-- Script IDEMPOTENT : réexécutable sans effet de bord. Aucune donnée semée.
-- À exécuter dans l'éditeur SQL Supabase.
-- ══════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════
-- 1) ÉTAPES DE LA DÉCLARATION D'ACCIDENT DU TRAVAIL
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.absences_at_etapes (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  absence_id       uuid        not null references public.absences_at (id) on delete cascade,
  code             text        not null,          -- constat | certificat | cerfa | feuille
  statut           text        not null default 'a_faire',  -- a_faire | en_cours | fait
  fait_le          date,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Une seule ligne par étape et par absence (cible du upsert de la page)
create unique index if not exists absences_at_etapes_absence_code_idx
  on public.absences_at_etapes (absence_id, code);

create index if not exists absences_at_etapes_etab_idx
  on public.absences_at_etapes (etablissement_id);

alter table public.absences_at_etapes enable row level security;

drop policy if exists absences_at_etapes_select on public.absences_at_etapes;
create policy absences_at_etapes_select
  on public.absences_at_etapes for select
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_at_etapes_insert on public.absences_at_etapes;
create policy absences_at_etapes_insert
  on public.absences_at_etapes for insert
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_at_etapes_update on public.absences_at_etapes;
create policy absences_at_etapes_update
  on public.absences_at_etapes for update
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  )
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_at_etapes_delete on public.absences_at_etapes;
create policy absences_at_etapes_delete
  on public.absences_at_etapes for delete
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );


-- ══════════════════════════════════════════════════════════════════════════
-- 2) IMPACT SUR LE PLANNING
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.absences_impact (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  absence_id       uuid        not null references public.absences_at (id) on delete cascade,
  poste            text        not null,          -- « Nuit — unité B », « AES — unité A »…
  couverture       text        not null default 'non_couvert', -- non_couvert | vacataire | cdd | interne
  detail           text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists absences_impact_absence_idx
  on public.absences_impact (absence_id);

create index if not exists absences_impact_etab_idx
  on public.absences_impact (etablissement_id);

alter table public.absences_impact enable row level security;

drop policy if exists absences_impact_select on public.absences_impact;
create policy absences_impact_select
  on public.absences_impact for select
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_impact_insert on public.absences_impact;
create policy absences_impact_insert
  on public.absences_impact for insert
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_impact_update on public.absences_impact;
create policy absences_impact_update
  on public.absences_impact for update
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  )
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_impact_delete on public.absences_impact;
create policy absences_impact_delete
  on public.absences_impact for delete
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );


-- ══════════════════════════════════════════════════════════════════════════
-- 3) COÛT DES ABSENCES
--    Données de paie : lecture réservée aux comptes de l'établissement, comme
--    partout ailleurs. absence_id est facultatif (montant global d'une année).
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.absences_couts (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  absence_id       uuid        references public.absences_at (id) on delete set null,
  annee            integer     not null,
  poste            text        not null,          -- maintien_salaire | remplacement | ijss
  montant          numeric(12,2) not null default 0,  -- IJSS récupérées : montant négatif
  commentaire      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists absences_couts_etab_annee_idx
  on public.absences_couts (etablissement_id, annee);

alter table public.absences_couts enable row level security;

drop policy if exists absences_couts_select on public.absences_couts;
create policy absences_couts_select
  on public.absences_couts for select
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_couts_insert on public.absences_couts;
create policy absences_couts_insert
  on public.absences_couts for insert
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_couts_update on public.absences_couts;
create policy absences_couts_update
  on public.absences_couts for update
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  )
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists absences_couts_delete on public.absences_couts;
create policy absences_couts_delete
  on public.absences_couts for delete
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );


-- ══════════════════════════════════════════════════════════════════════════
-- Horodatage de mise à jour (une fonction, trois déclencheurs)
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.absences_v2_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists absences_at_etapes_touch_trg on public.absences_at_etapes;
create trigger absences_at_etapes_touch_trg
  before update on public.absences_at_etapes
  for each row execute function public.absences_v2_touch();

drop trigger if exists absences_impact_touch_trg on public.absences_impact;
create trigger absences_impact_touch_trg
  before update on public.absences_impact
  for each row execute function public.absences_v2_touch();

drop trigger if exists absences_couts_touch_trg on public.absences_couts;
create trigger absences_couts_touch_trg
  before update on public.absences_couts
  for each row execute function public.absences_v2_touch();
