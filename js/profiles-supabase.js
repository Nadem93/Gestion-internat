// ── COUCHE SUPABASE — ANNUAIRE DES COMPTES (profils) DE L'ÉTABLISSEMENT ──
// Sert à résoudre id → prénom/nom/fonction là où l'app lisait encore la
// liste legacy DB.keys.users (localStorage, jamais synchronisée avec les
// vrais comptes Supabase — cause probable du bug "badge messages non lus").
// Ne remplace PAS l'authentification (Auth.login reste sur DB.keys.users,
// décision utilisateur du 2026-06-27 : ne pas refondre l'auth pour ça).

let _profilesCache = [];
async function sbLoadProfilesCache() { _profilesCache = await sbGetProfiles(); return _profilesCache; }
function sbProfiles() { return _profilesCache; }

async function sbGetProfiles() {
  const { data, error } = await supabaseClient
    .from('profiles').select('id, prenom, nom, fonction, role').order('nom');
  if (error) { console.error('[sbGetProfiles]', error); return []; }
  return data || [];
}
