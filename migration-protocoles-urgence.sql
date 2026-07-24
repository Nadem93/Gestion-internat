-- ════════════════════════════════════════════════════════════════════
--  MIGRATION — PROTOCOLES D'URGENCE (conduite à tenir, par résident)
--  À exécuter UNE FOIS dans l'éditeur SQL de Supabase.
--  Convention projet : etablissement_id en TEXT (= profiles.etablissement_id),
--  RLS par établissement sur les 4 commandes.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.protocoles_urgence (
  id                uuid primary key default gen_random_uuid(),
  etablissement_id  text not null,
  resident_id       uuid not null,
  type              text not null default 'autre',   -- epilepsie|fausse_route|allergie|comportement|hypoglycemie|cardiaque|autre
  titre             text not null default '',
  signes            text default '',                 -- signes d'alerte à reconnaître
  conduite          text default '',                 -- conduite à tenir (le cœur du protocole)
  traitement        text default '',                 -- traitement / médicament d'urgence prescrit
  contacts          text default '',                 -- qui appeler (médecin, SAMU, référent…)
  gravite           text not null default 'important', -- critique|important|info
  actif             boolean not null default true,
  notes             text default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists protocoles_urgence_etab_idx     on public.protocoles_urgence (etablissement_id);
create index if not exists protocoles_urgence_resident_idx on public.protocoles_urgence (resident_id);

alter table public.protocoles_urgence enable row level security;

drop policy if exists protocoles_urgence_select on public.protocoles_urgence;
create policy protocoles_urgence_select on public.protocoles_urgence for select
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists protocoles_urgence_insert on public.protocoles_urgence;
create policy protocoles_urgence_insert on public.protocoles_urgence for insert
  with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists protocoles_urgence_update on public.protocoles_urgence;
create policy protocoles_urgence_update on public.protocoles_urgence for update
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()))
  with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));

drop policy if exists protocoles_urgence_delete on public.protocoles_urgence;
create policy protocoles_urgence_delete on public.protocoles_urgence for delete
  using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
