-- ════════════════════════════════════════════════════════════════════
--  AUDIT RLS — colle ce script dans le SQL Editor de Supabase, puis Run.
--  Il liste chaque table du schéma "public" : la RLS est-elle activée,
--  et combien de policies (idéal : 4 → select/insert/update/delete).
--  ⚠️ À corriger : toute ligne avec verdict 🔴 (et à vérifier les 🟠).
-- ════════════════════════════════════════════════════════════════════

select
  c.relname                          as table_name,
  c.relrowsecurity                   as rls_active,
  count(pol.polname)                 as nb_policies,
  case
    when not c.relrowsecurity        then '🔴 RLS DÉSACTIVÉE'
    when count(pol.polname) = 0      then '🔴 aucune policy'
    when count(pol.polname) < 4      then '🟠 moins de 4 policies (à vérifier)'
    else '✅ ok'
  end                                as verdict
from pg_class c
join pg_namespace n      on n.oid = c.relnamespace
left join pg_policy pol  on pol.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'              -- tables ordinaires uniquement
group by c.relname, c.relrowsecurity
order by c.relrowsecurity asc, nb_policies asc, c.relname;
