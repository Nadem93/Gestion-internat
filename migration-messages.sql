-- ══════════════════════════════════════════════════════════════════════════
-- Conversations épinglées (page Messages)
--
-- À exécuter UNE FOIS dans l'éditeur SQL de Supabase. Idempotent.
--
-- Apporté par la maquette « Messages - refonte (bento) » : la liste des
-- conversations y affiche une épingle et un filtre « Épinglées ». Rien
-- d'équivalent n'existait en base — la table conversations ne porte que les
-- participants, pas de préférence d'affichage par utilisateur.
--
-- L'épinglage est PERSONNEL : chacun épingle ses propres conversations, une
-- ligne par (compte, conversation). Les autres données de la maquette
-- (présence « en ligne », « en train d'écrire… », pièces jointes) ne sont pas
-- créées ici : elles n'ont pas d'usage métier avéré et la page ne les affiche
-- donc pas.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.messages_epingles (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  profile_id       uuid not null,                   -- auth.uid() du propriétaire
  conv_id          text not null,                   -- conversations.conv_id
  created_at       timestamptz not null default now()
);

-- Une conversation ne peut être épinglée qu'une fois par compte : c'est cette
-- contrainte qui rend le bouton d'épinglage idempotent côté client.
create unique index if not exists messages_epingles_profil_conv_uidx
  on public.messages_epingles (profile_id, conv_id);
create index if not exists messages_epingles_etab_idx
  on public.messages_epingles (etablissement_id, created_at desc);

alter table public.messages_epingles enable row level security;

-- Lecture : uniquement SES propres épingles, et seulement dans son
-- établissement. Une épingle est une préférence privée d'affichage : aucun
-- collègue n'a de raison de voir ce que les autres gardent en haut de liste.
drop policy if exists messages_epingles_select on public.messages_epingles;
create policy messages_epingles_select on public.messages_epingles
  for select to authenticated using (
    messages_epingles.profile_id = auth.uid()
    and exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = messages_epingles.etablissement_id));

-- Création : uniquement pour soi-même, dans son propre établissement.
drop policy if exists messages_epingles_insert on public.messages_epingles;
create policy messages_epingles_insert on public.messages_epingles
  for insert to authenticated with check (
    messages_epingles.profile_id = auth.uid()
    and exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = messages_epingles.etablissement_id));

-- Modification : même règle (aucun transfert d'épingle vers un autre compte).
drop policy if exists messages_epingles_update on public.messages_epingles;
create policy messages_epingles_update on public.messages_epingles
  for update to authenticated using (
    messages_epingles.profile_id = auth.uid()
    and exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = messages_epingles.etablissement_id));

-- Retrait : chacun désépingle ses propres conversations.
drop policy if exists messages_epingles_delete on public.messages_epingles;
create policy messages_epingles_delete on public.messages_epingles
  for delete to authenticated using (
    messages_epingles.profile_id = auth.uid()
    and exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.etablissement_id = messages_epingles.etablissement_id));

comment on table public.messages_epingles is
  'Conversations épinglées par un compte sur la page Messages (préférence privée d''affichage, une ligne par compte et par conversation).';
