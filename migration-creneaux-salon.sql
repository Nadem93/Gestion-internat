-- ══════════════════════════════════════════════════════════════════════════
-- Créneaux du salon famille (page Visites & famille)
--
-- À exécuter dans l'éditeur SQL de Supabase. Idempotent : ré-exécutable
-- sans risque (create if not exists + drop policy if exists).
--
-- Une ligne = un créneau réservé. Un créneau se libère en supprimant la
-- ligne : il n'y a pas d'état « libre » stocké, le libre est l'absence de
-- réservation sur la plage horaire affichée par la page.
--
-- Droits retenus (même règle que les consignes et le répertoire) :
--   · lecture      : tout le personnel de l'établissement ;
--   · réservation  : tout le personnel de l'établissement (pas la famille,
--                    qui n'a pas de ligne dans public.profiles) ;
--   · modification / libération : l'auteur de la réservation, ou un
--                    administrateur — pour qu'un agent ne puisse pas
--                    annuler la réservation d'un collègue par mégarde,
--                    la direction restant en mesure de débloquer.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.creneaux_salon (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  date             date not null,
  heure_debut      time not null,
  heure_fin        time not null,
  salle            text not null default 'Salon famille',
  visite_id        uuid,
  reserve_par      text,
  created_by       text,
  created_at       timestamptz not null default now()
);

-- Lien facultatif vers la visite correspondante. Posé dans un bloc gardé :
-- la contrainte n'est ajoutée que si public.visites.id est bien un uuid,
-- pour que la migration reste rejouable quel que soit l'état du schéma.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'creneaux_salon_visite_id_fkey'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'visites'
      and column_name = 'id' and data_type = 'uuid'
  ) then
    alter table public.creneaux_salon
      add constraint creneaux_salon_visite_id_fkey
      foreign key (visite_id) references public.visites(id) on delete set null;
  end if;
end $$;

create index if not exists creneaux_salon_etab_date_idx
  on public.creneaux_salon (etablissement_id, date);

alter table public.creneaux_salon enable row level security;

-- Lecture : tout compte authentifié rattaché au même établissement.
drop policy if exists creneaux_salon_select on public.creneaux_salon;
create policy creneaux_salon_select on public.creneaux_salon
  for select to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = creneaux_salon.etablissement_id));

-- Réservation : tout compte authentifié rattaché à l'établissement.
drop policy if exists creneaux_salon_insert on public.creneaux_salon;
create policy creneaux_salon_insert on public.creneaux_salon
  for insert to authenticated with check (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = creneaux_salon.etablissement_id));

-- Modification : l'auteur de la réservation, ou un administrateur.
drop policy if exists creneaux_salon_update on public.creneaux_salon;
create policy creneaux_salon_update on public.creneaux_salon
  for update to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = creneaux_salon.etablissement_id
        and (creneaux_salon.created_by = auth.uid()::text
             or p.role in ('admin','superadmin'))));

-- Libération (suppression) : l'auteur de la réservation, ou un administrateur.
drop policy if exists creneaux_salon_delete on public.creneaux_salon;
create policy creneaux_salon_delete on public.creneaux_salon
  for delete to authenticated using (
    exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = creneaux_salon.etablissement_id
        and (creneaux_salon.created_by = auth.uid()::text
             or p.role in ('admin','superadmin'))));

comment on table public.creneaux_salon is
  'Réservations du salon famille affichées sur la page Visites. Réservation ouverte à tout le personnel de l''établissement ; libération par l''auteur ou un administrateur.';
