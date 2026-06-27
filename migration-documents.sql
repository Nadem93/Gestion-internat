-- ════════════════════════════════════════════════════════════════════
--  Migration « Documents des résidents » → Supabase
--  Fichiers stockés dans le bucket Storage "justificatifs".
--  resident_id = '_resources' pour les documents-ressources (non liés à un résident).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.documents_resident (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  resident_id      text,
  name             text default '',
  file_name        text default '',
  size             integer default 0,
  mime_type        text default '',
  category         text default '',
  doc_date         date,
  due_date         date,
  fichier_path     text,
  type             text default 'resident',
  uploaded_by      text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists documents_resident_etab_idx on public.documents_resident(etablissement_id);
create index if not exists documents_resident_res_idx on public.documents_resident(resident_id);
alter table public.documents_resident enable row level security;
drop policy if exists sel_documents_resident on public.documents_resident;
drop policy if exists ins_documents_resident on public.documents_resident;
drop policy if exists upd_documents_resident on public.documents_resident;
drop policy if exists del_documents_resident on public.documents_resident;
create policy sel_documents_resident on public.documents_resident for select using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy ins_documents_resident on public.documents_resident for insert with check (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy upd_documents_resident on public.documents_resident for update using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
create policy del_documents_resident on public.documents_resident for delete using (etablissement_id = (select etablissement_id from public.profiles where id = auth.uid()));
