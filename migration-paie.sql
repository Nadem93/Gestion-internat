-- ══════════════════════════════════════════════════════════════════════
-- INTERNALIS — Fiches de paie (RH) : cycle de paie, statuts de bulletin,
-- soldes de tout compte.
--
-- Idempotent : exécutable plusieurs fois sans effet de bord.
-- À exécuter dans l'éditeur SQL Supabase.
--
-- Sans ces tables la page paie.html reste utilisable : les blocs concernés
-- s'affichent vides (« non renseigné ») et toute écriture est refusée avec
-- un message nommant ce fichier. Aucune valeur n'est inventée.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1) Cycle de paie du mois ───────────────────────────────────────────
-- Une ligne par établissement et par période (YYYY-MM).
-- Alimente : le fil du workflow, le bloc DSN, les échéances déclaratives
-- et la part patronale de la masse salariale.
create table if not exists public.paie_periodes (
  id                     uuid primary key default gen_random_uuid(),
  etablissement_id       text not null,
  periode                text not null,                 -- 'YYYY-MM'
  etape                  text not null default 'collecte',
                                                        -- collecte | calcul | controle | virement | dsn | termine
  dsn_statut             text not null default 'a_transmettre',
                                                        -- a_transmettre | transmise
  dsn_transmise_le       timestamptz,
  dsn_date_limite        date,
  urssaf_montant         numeric,
  retraite_montant       numeric,
  prevoyance_montant     numeric,
  cotisations_patronales numeric,
  virement_date          date,
  commentaire            text not null default '',
  maj_par                text not null default '',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create unique index if not exists paie_periodes_uniq
  on public.paie_periodes (etablissement_id, periode);

alter table public.paie_periodes enable row level security;

drop policy if exists paie_periodes_select on public.paie_periodes;
create policy paie_periodes_select on public.paie_periodes
  for select using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists paie_periodes_insert on public.paie_periodes;
create policy paie_periodes_insert on public.paie_periodes
  for insert with check (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  );

drop policy if exists paie_periodes_update on public.paie_periodes;
create policy paie_periodes_update on public.paie_periodes
  for update using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  ) with check (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists paie_periodes_delete on public.paie_periodes;
create policy paie_periodes_delete on public.paie_periodes
  for delete using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  );


-- ── 2) Statut et éléments individuels d'un bulletin ────────────────────
-- Une ligne par fiche de paie. Alimente : la colonne « Statut » du tableau,
-- le bloc prélèvement à la source et le bloc acomptes & saisies.
create table if not exists public.paie_bulletin_statuts (
  id               uuid primary key default gen_random_uuid(),
  etablissement_id text not null,
  fiche_paie_id    text not null,
  employe_id       text not null default '',
  statut           text not null default 'calcule',    -- calcule | verifier | valide
  taux_pas         numeric,                            -- taux de prélèvement à la source (%)
  montant_pas      numeric,                            -- montant prélevé (€)
  acompte          numeric,                            -- acompte / saisie (€, positif)
  acompte_motif    text not null default '',
  distribue_le     timestamptz,                        -- mise à disposition coffre-fort
  valide_par       text,
  valide_le        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists paie_bulletin_statuts_uniq
  on public.paie_bulletin_statuts (etablissement_id, fiche_paie_id);
create index if not exists paie_bulletin_statuts_emp_idx
  on public.paie_bulletin_statuts (etablissement_id, employe_id);

alter table public.paie_bulletin_statuts enable row level security;

drop policy if exists paie_bulletin_statuts_select on public.paie_bulletin_statuts;
create policy paie_bulletin_statuts_select on public.paie_bulletin_statuts
  for select using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists paie_bulletin_statuts_insert on public.paie_bulletin_statuts;
create policy paie_bulletin_statuts_insert on public.paie_bulletin_statuts
  for insert with check (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  );

drop policy if exists paie_bulletin_statuts_update on public.paie_bulletin_statuts;
create policy paie_bulletin_statuts_update on public.paie_bulletin_statuts
  for update using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  ) with check (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists paie_bulletin_statuts_delete on public.paie_bulletin_statuts;
create policy paie_bulletin_statuts_delete on public.paie_bulletin_statuts
  for delete using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  );


-- ── 3) Solde de tout compte (fin de contrat) ───────────────────────────
create table if not exists public.paie_soldes_tout_compte (
  id                   uuid primary key default gen_random_uuid(),
  etablissement_id     text not null,
  employe_id           text not null,
  employe_nom          text not null default '',
  motif                text not null default '',        -- fin de CDD, démission, rupture…
  date_fin             date,
  indemnite_precarite  numeric,
  conges_payes_solde   numeric,
  autres_indemnites    numeric,
  net_a_verser         numeric,
  statut               text not null default 'prepare', -- prepare | valide | verse
  documents_generes_le timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists paie_stc_etab_idx
  on public.paie_soldes_tout_compte (etablissement_id, date_fin desc);

alter table public.paie_soldes_tout_compte enable row level security;

drop policy if exists paie_stc_select on public.paie_soldes_tout_compte;
create policy paie_stc_select on public.paie_soldes_tout_compte
  for select using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists paie_stc_insert on public.paie_soldes_tout_compte;
create policy paie_stc_insert on public.paie_soldes_tout_compte
  for insert with check (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  );

drop policy if exists paie_stc_update on public.paie_soldes_tout_compte;
create policy paie_stc_update on public.paie_soldes_tout_compte
  for update using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  ) with check (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists paie_stc_delete on public.paie_soldes_tout_compte;
create policy paie_stc_delete on public.paie_soldes_tout_compte
  for delete using (
    etablissement_id in (
      select p.etablissement_id from public.profiles p where p.id = auth.uid()
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin', 'rh')
    )
  );
