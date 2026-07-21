// ── CONNEXION SUPABASE ──
// Clé "publishable" (anon) : volontairement publique, protégée par les règles RLS
// côté base de données. Ne jamais mettre la clé "secret"/"service_role" ici.
const SUPABASE_URL = 'https://udgnbqxabsgcnrtuemca.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_kzmR2wc7ewYTYH0nYL2xbg_cBnMzlju';

// ── MUTUALISATION DES LECTURES SIMULTANÉES ──
// Les pages composent leur affichage à partir de plusieurs modules qui
// chargent chacun ce dont ils ont besoin. Résultat : la MÊME lecture part
// plusieurs fois en parallèle (mesuré sur admin.html : 23 requêtes pour
// 12 distinctes, `residents` demandé 3 fois).
//
// Quand une lecture identique est DÉJÀ EN VOL, on rattache l'appelant à
// celle-ci au lieu d'ouvrir un second aller-retour. Aucune donnée périmée
// n'est possible : on ne réutilise jamais une réponse terminée, seulement une
// requête encore en cours. Rien n'est mis en cache.
//
// Deux garde-fous :
//  · uniquement les GET — fusionner deux écritures en perdrait une ;
//  · la clé inclut les en-têtes, car `.range()` (pagination de sbFetchAll)
//    voyage dans l'en-tête `Range` et non dans l'URL : sans ça, deux pages
//    différentes seraient confondues.
const _sbEnVol = new Map();

function _sbCle(url, init) {
  const h = init && init.headers;
  let entetes = '';
  if (h) {
    const paires = typeof h.forEach === 'function' && !Array.isArray(h)
      ? (() => { const a = []; h.forEach((v, k) => a.push(k + ':' + v)); return a; })()
      : Object.entries(h).map(([k, v]) => k + ':' + v);
    entetes = paires.sort().join('|');
  }
  return url + '\n' + entetes;
}

function _sbFetch(input, init) {
  const url = typeof input === 'string' ? input : (input && input.url) || String(input);
  const methode = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
  if (methode !== 'GET') return fetch(input, init);

  const cle = _sbCle(url, init);
  const enVol = _sbEnVol.get(cle);
  // .clone() est indispensable : un corps de réponse ne se lit qu'une fois.
  if (enVol) return enVol.then(r => r.clone());

  const p = fetch(input, init);
  _sbEnVol.set(cle, p);
  p.then(() => _sbEnVol.delete(cle), () => _sbEnVol.delete(cle));
  return p.then(r => r.clone());
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: { fetch: _sbFetch }
});

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
