-- ══════════════════════════════════════════════════════════════════════════
-- INTERNALIS — Rapport d'activité · suivi & historique
--
-- La maquette « Rapport d'activité (pilotage) » affiche quatre blocs qui
-- n'avaient aucune source en base :
--   · « Comptes rendus obligatoires »  (Rapport annuel ARS, Bilan CVS…)
--   · « Diffusion du rapport »         (CA, ARS / Département, CVS, équipe)
--   · « Prochaine échéance »           (date de remise du rapport annuel)
--   · « Historique des rapports »      (rapports déjà générés)
-- Les trois premiers sont portés par public.rapport_suivi (une ligne par
-- élément, discriminée par la colonne `type`), le quatrième par
-- public.rapports_generes, alimentée automatiquement à chaque génération
-- de PDF depuis rapport.html.
--
-- Tout le reste de la page (taux d'occupation, mouvements, sections,
-- comparaison N-1, SERAFIN-PH, contributions) est calculé à partir des
-- tables déjà existantes : rien à créer.
--
-- Dégradation douce : tant que ce script n'a pas été exécuté, la page reste
-- pleinement utilisable — la lecture renvoie [] avec un console.warn, les
-- blocs concernés affichent un état vide (aucune valeur inventée) et seule
-- l'écriture est refusée, avec un toast citant ce fichier.
--
-- Script IDEMPOTENT : réexécutable sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase. Aucune donnée n'est semée.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ══ 1) SUIVI DU RAPPORT ═════════════════════════════════════════════════
create table if not exists public.rapport_suivi (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  type             text        not null,          -- obligatoire | diffusion | echeance
  libelle          text        not null,
  statut           text,                          -- cf. contrainte ci-dessous
  echeance         date,                          -- renseignée pour type = 'echeance'
  annee            smallint,                      -- exercice concerné (facultatif)
  ordre            smallint    not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Colonnes ajoutées après coup (rejeu sur une base déjà créée)
alter table public.rapport_suivi add column if not exists statut     text;
alter table public.rapport_suivi add column if not exists echeance   date;
alter table public.rapport_suivi add column if not exists annee      smallint;
alter table public.rapport_suivi add column if not exists ordre      smallint not null default 0;
alter table public.rapport_suivi add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rapport_suivi_type_chk' and conrelid = 'public.rapport_suivi'::regclass
  ) then
    alter table public.rapport_suivi
      add constraint rapport_suivi_type_chk
      check (type in ('obligatoire', 'diffusion', 'echeance'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'rapport_suivi_statut_chk' and conrelid = 'public.rapport_suivi'::regclass
  ) then
    alter table public.rapport_suivi
      add constraint rapport_suivi_statut_chk
      check (statut is null or statut in (
        'fait', 'en_cours', 'planifie',
        'transmis', 'a_transmettre', 'presente', 'non_concerne'
      ));
  end if;

  -- Une échéance porte une date ; les deux autres types portent un statut.
  if not exists (
    select 1 from pg_constraint
    where conname = 'rapport_suivi_coherence_chk' and conrelid = 'public.rapport_suivi'::regclass
  ) then
    alter table public.rapport_suivi
      add constraint rapport_suivi_coherence_chk
      check (
        (type = 'echeance' and echeance is not null)
        or (type <> 'echeance')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'rapport_suivi_annee_chk' and conrelid = 'public.rapport_suivi'::regclass
  ) then
    alter table public.rapport_suivi
      add constraint rapport_suivi_annee_chk
      check (annee is null or annee between 2000 and 2100);
  end if;
end$$;

create index if not exists rapport_suivi_etab_idx  on public.rapport_suivi (etablissement_id);
create index if not exists rapport_suivi_type_idx  on public.rapport_suivi (type, annee);

alter table public.rapport_suivi enable row level security;

drop policy if exists rapport_suivi_select on public.rapport_suivi;
drop policy if exists rapport_suivi_insert on public.rapport_suivi;
drop policy if exists rapport_suivi_update on public.rapport_suivi;
drop policy if exists rapport_suivi_delete on public.rapport_suivi;

create policy rapport_suivi_select
  on public.rapport_suivi for select
  to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

create policy rapport_suivi_insert
  on public.rapport_suivi for insert
  to authenticated
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

create policy rapport_suivi_update
  on public.rapport_suivi for update
  to authenticated
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

create policy rapport_suivi_delete
  on public.rapport_suivi for delete
  to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

create or replace function public.rapport_suivi_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists rapport_suivi_touch_trg on public.rapport_suivi;
create trigger rapport_suivi_touch_trg
  before update on public.rapport_suivi
  for each row execute function public.rapport_suivi_touch();


-- ══ 2) HISTORIQUE DES RAPPORTS GÉNÉRÉS ══════════════════════════════════
create table if not exists public.rapports_generes (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text        not null,
  libelle          text        not null,
  periode_type     text,                          -- mois | annee
  periode_debut    date,
  periode_fin      date,
  genere_le        timestamptz not null default now(),
  genere_par       text,
  genere_par_id    uuid,
  created_at       timestamptz not null default now()
);

alter table public.rapports_generes add column if not exists periode_type  text;
alter table public.rapports_generes add column if not exists periode_debut date;
alter table public.rapports_generes add column if not exists periode_fin   date;
alter table public.rapports_generes add column if not exists genere_par    text;
alter table public.rapports_generes add column if not exists genere_par_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rapports_generes_type_chk' and conrelid = 'public.rapports_generes'::regclass
  ) then
    alter table public.rapports_generes
      add constraint rapports_generes_type_chk
      check (periode_type is null or periode_type in ('mois', 'annee'));
  end if;
end$$;

create index if not exists rapports_generes_etab_idx on public.rapports_generes (etablissement_id);
create index if not exists rapports_generes_date_idx on public.rapports_generes (genere_le desc);

alter table public.rapports_generes enable row level security;

drop policy if exists rapports_generes_select on public.rapports_generes;
drop policy if exists rapports_generes_insert on public.rapports_generes;
drop policy if exists rapports_generes_update on public.rapports_generes;
drop policy if exists rapports_generes_delete on public.rapports_generes;

create policy rapports_generes_select
  on public.rapports_generes for select
  to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

create policy rapports_generes_insert
  on public.rapports_generes for insert
  to authenticated
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

create policy rapports_generes_update
  on public.rapports_generes for update
  to authenticated
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

create policy rapports_generes_delete
  on public.rapports_generes for delete
  to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );
