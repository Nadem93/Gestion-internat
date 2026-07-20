-- ════════════════════════════════════════════════════════════════════════
-- MES CONGÉS — compteurs de congés par salarié (« Mes compteurs »)
--
-- La maquette « Demandes congés (RH) » affiche des compteurs (CP N-1, CP N,
-- RTT, récupération, CET) qui n'avaient aucune source en base. Cette table
-- les porte, saisis par l'administration, lus en seule lecture par la page
-- mes-conges.html.
--
-- Idempotent : exécutable plusieurs fois sans erreur.
-- À exécuter dans l'éditeur SQL Supabase. NE PAS exécuter automatiquement.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.conges_soldes (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  employe_id        text not null,
  annee             integer not null default extract(year from current_date),
  cp_n1             numeric(5,2),
  cp_acquis         numeric(5,2),
  cp_pris           numeric(5,2),
  rtt               numeric(5,2),
  recup             numeric(5,2),
  cet               numeric(5,2),
  commentaire       text default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists conges_soldes_uniq
  on public.conges_soldes (etablissement_id, employe_id, annee);
create index if not exists conges_soldes_employe_idx
  on public.conges_soldes (employe_id);

alter table public.conges_soldes enable row level security;

-- Les quatre politiques sont filtrées par l'établissement du profil connecté.
drop policy if exists conges_soldes_select on public.conges_soldes;
create policy conges_soldes_select on public.conges_soldes
  for select to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists conges_soldes_insert on public.conges_soldes;
create policy conges_soldes_insert on public.conges_soldes
  for insert to authenticated
  with check (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists conges_soldes_update on public.conges_soldes;
create policy conges_soldes_update on public.conges_soldes
  for update to authenticated
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

drop policy if exists conges_soldes_delete on public.conges_soldes;
create policy conges_soldes_delete on public.conges_soldes
  for delete to authenticated
  using (
    etablissement_id = (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

-- Tant que cette migration n'est pas exécutée, mes-conges.html affiche le bloc
-- « Mes compteurs » vide (console.warn), sans jamais inventer de valeur.
