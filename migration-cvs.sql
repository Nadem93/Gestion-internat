-- ════════════════════════════════════════════════════════════════════
--  Migration « CVS » (Conseil de la Vie Sociale) → Supabase
--  À exécuter APRÈS migration-dossiers.sql (table echeances) et
--  migration-pilotage.sql (table satisfaction), dont le CVS dépend.
--  Tout le CVS (membres + séances + thématiques) tient dans un objet jsonb
--  par établissement.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.cvs (
  etablissement_id text primary key,
  data             jsonb default '{}'::jsonb,
  updated_at       timestamptz default now()
);
alter table public.cvs enable row level security;
drop policy if exists sel_cvs on public.cvs;
drop policy if exists ins_cvs on public.cvs;
drop policy if exists upd_cvs on public.cvs;
drop policy if exists del_cvs on public.cvs;
create policy sel_cvs on public.cvs for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_cvs on public.cvs for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_cvs on public.cvs for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_cvs on public.cvs for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
