-- ── Journal d'audit de l'assistant IA ──
-- Trace QUI a demandé QUOI, QUAND, avec quels volumes — JAMAIS le contenu
-- des prompts ni des réponses. Sert aussi de compteur pour le rate-limit
-- (15 demandes / heure / utilisateur, comptées par l'edge function).
-- À exécuter dans le SQL Editor de Supabase AVANT le premier usage de
-- l'assistant (le bouton ✨ renverra une erreur de collecte sinon).

create table if not exists public.ia_journal (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  user_id          uuid not null,
  user_name        text not null default '',
  action           text not null check (action in ('synthese_resident','bilan_semestriel','brouillon_avenant')),
  resident_id      text,                    -- text : cohérent avec l'usage String(residentId) du code existant
  periode_du       date,
  periode_au       date,
  modele           text default '',
  input_tokens     integer,
  output_tokens    integer,
  duree_ms         integer,
  statut           text not null default 'ok' check (statut in ('ok','erreur','refus','rate_limited')),
  erreur           text not null default '',
  created_at       timestamptz not null default now()
);

create index if not exists ia_journal_user_heure_idx on public.ia_journal (user_id, created_at desc);  -- rate-limit
create index if not exists ia_journal_etab_idx       on public.ia_journal (etablissement_id, created_at desc);

alter table public.ia_journal enable row level security;

-- ÉCRITURE : uniquement l'edge function (service_role contourne la RLS) → AUCUNE policy insert/update/delete.
-- LECTURE : admins de l'établissement (page console / suivi des usages).
drop policy if exists ia_journal_select_admin on public.ia_journal;
create policy ia_journal_select_admin on public.ia_journal
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = ia_journal.etablissement_id
        and p.role in ('admin','superadmin')
    )
  );
