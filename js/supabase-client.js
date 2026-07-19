// ── CONNEXION SUPABASE ──
// Clé "publishable" (anon) : volontairement publique, protégée par les règles RLS
// côté base de données. Ne jamais mettre la clé "secret"/"service_role" ici.
const SUPABASE_URL = 'https://udgnbqxabsgcnrtuemca.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_kzmR2wc7ewYTYH0nYL2xbg_cBnMzlju';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ── LECTURE PAGINÉE ──
// PostgREST plafonne chaque requête à ~1000 lignes : au-delà, le résultat est
// tronqué EN SILENCE (pas d'erreur). Ce helper enchaîne les pages jusqu'à
// épuisement. `buildQuery` doit renvoyer une requête NEUVE à chaque appel
// (les builders supabase-js ne sont pas réutilisables) et inclure un .order()
// stable pour que la pagination soit déterministe.
async function sbFetchAll(buildQuery, pageSize = 1000) {
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}
