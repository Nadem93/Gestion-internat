-- ── Registre des scellés de signature (append-only) ──
-- Chaque scellé fige, CÔTÉ SERVEUR, l'empreinte SHA-256 du contenu d'un avenant
-- au moment où une partie signe. Les clients peuvent LIRE ce registre mais
-- JAMAIS y écrire (aucune policy insert/update/delete → seule l'edge function,
-- via service_role, insère). Une falsification interne de l'avenant devient
-- ainsi détectable (l'empreinte courante ne correspond plus au scellé) et un
-- re-scellé laisse une trace indélébile (append-only : on n'écrase jamais).
-- À exécuter dans le SQL Editor de Supabase.

create table if not exists public.signature_sceaux (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  ppe_id           text not null,          -- id de l'avenant (String(id) côté code)
  role             text not null,          -- resident | representant | referent | direction
  empreinte        text not null,          -- SHA-256 hex du contenu, calculé par l'edge function
  nom              text not null default '',-- nom du signataire (dénormalisé, lisibilité)
  par              uuid,                    -- compte connecté ayant recueilli la signature
  par_nom          text not null default '',
  scelle_le        timestamptz not null default now()
);

create index if not exists signature_sceaux_ppe_idx  on public.signature_sceaux (ppe_id, role, scelle_le desc);
create index if not exists signature_sceaux_etab_idx on public.signature_sceaux (etablissement_id, scelle_le desc);

alter table public.signature_sceaux enable row level security;

-- LECTURE : tout membre authentifié de l'établissement (le badge de scellé
-- s'affiche sur l'avenant pour l'équipe). ÉCRITURE : aucune policy → réservée
-- à l'edge function (service_role contourne la RLS).
drop policy if exists signature_sceaux_select on public.signature_sceaux;
create policy signature_sceaux_select on public.signature_sceaux
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.etablissement_id = signature_sceaux.etablissement_id
    )
  );
