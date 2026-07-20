// ── COUCHE SUPABASE — CONSIGNES DE VEILLE & ÉTAT DU SOMMEIL ──
// Apporté par la maquette « Cahier de nuit (vie quotidienne) » :
//   · veille_consignes : consigne permanente par résident, réaffichée chaque nuit
//   · sommeil_nuit     : un état de sommeil par résident et par nuit
//
// Dégradation douce : tant que migration-veille-sommeil.sql n'a pas été exécuté,
// les lectures renvoient [] avec un console.warn et la page reste utilisable.
// Les écritures, elles, remontent l'erreur : l'appelant affiche un toast qui
// nomme le fichier SQL à exécuter (voir VEILLE_SQL_FILE).
//
// sbGetEtablissementId() est défini dans js/residents-supabase.js.

const VEILLE_SQL_FILE = 'migration-veille-sommeil.sql';

// created_by stocke l'UID d'authentification, pas session.userId (identifiant
// hérité, différent) : c'est lui que la politique RLS compare à auth.uid().
async function _vlAuthUid() {
  try {
    const { data } = await supabaseClient.auth.getUser();
    return (data && data.user && data.user.id) || null;
  } catch (e) { console.error('[veille] uid', e); return null; }
}

// Message d'écriture : toujours nommer le script à exécuter, l'erreur PostgREST
// brute (« relation does not exist ») ne dit rien à un utilisateur.
function veilleErrMsg(e) {
  const m = ((e && (e.message || e.msg)) || '') + ' ' + ((e && e.code) || '');
  // Session Supabase perdue : rien à voir avec la migration, on le dit tel quel.
  if (/non connect|jwt|not authenticated/i.test(m)) {
    return 'Session Supabase expirée — reconnectez-vous.';
  }
  if (/does not exist|schema cache|42P01|PGRST205/i.test(m)) {
    return 'Table absente : exécutez ' + VEILLE_SQL_FILE + ' dans Supabase.';
  }
  return 'Erreur d\'enregistrement (' + VEILLE_SQL_FILE + ' bien exécuté ?)';
}

// ── CONSIGNES DE VEILLE ──────────────────────────────────────────────

function _vcFromRow(r) {
  return {
    id: r.id,
    residentId: r.resident_id || '',
    texte: r.texte || '',
    actif: r.actif !== false,
    createdBy: r.created_by || '',
    createdAt: r.created_at
  };
}

async function sbGetVeilleConsignes() {
  try {
    const { data, error } = await supabaseClient
      .from('veille_consignes').select('*')
      .eq('actif', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(_vcFromRow);
  } catch (e) {
    console.warn('[veille] consignes illisibles (' + VEILLE_SQL_FILE + ' exécuté ?)', e);
    return [];
  }
}

async function sbSaveVeilleConsigne(c) {
  const [etablissementId, uid] = await Promise.all([sbGetEtablissementId(), _vlAuthUid()]);
  const row = {
    etablissement_id: etablissementId,
    resident_id: String(c.residentId || ''),
    texte: c.texte || '',
    actif: c.actif !== false,
    created_by: uid
  };
  const { data, error } = await supabaseClient
    .from('veille_consignes').insert(row).select();
  if (error) throw error;
  return _vcFromRow(data[0]);
}

async function sbDeleteVeilleConsigne(id) {
  const { error } = await supabaseClient
    .from('veille_consignes').delete().eq('id', id);
  if (error) throw error;
}

// ── ÉTAT DU SOMMEIL ──────────────────────────────────────────────────

const SOMMEIL_ETATS = ['calme', 'agite', 'reveil', 'absent'];

function _smFromRow(r) {
  return {
    id: r.id,
    residentId: r.resident_id || '',
    date: r.date,
    etat: SOMMEIL_ETATS.includes(r.etat) ? r.etat : 'calme',
    note: r.note || '',
    createdBy: r.created_by || '',
    createdAt: r.created_at
  };
}

async function sbGetSommeilNuit(date) {
  try {
    const { data, error } = await supabaseClient
      .from('sommeil_nuit').select('*').eq('date', date);
    if (error) throw error;
    return (data || []).map(_smFromRow);
  } catch (e) {
    console.warn('[veille] sommeil illisible (' + VEILLE_SQL_FILE + ' exécuté ?)', e);
    return [];
  }
}

// Un état par résident et par nuit : on s'appuie sur l'index unique
// (resident_id, date) posé par la migration.
async function sbSaveSommeilNuit(s) {
  const [etablissementId, uid] = await Promise.all([sbGetEtablissementId(), _vlAuthUid()]);
  const row = {
    etablissement_id: etablissementId,
    resident_id: String(s.residentId || ''),
    date: s.date,
    etat: SOMMEIL_ETATS.includes(s.etat) ? s.etat : 'calme',
    note: s.note || '',
    created_by: uid
  };
  const { data, error } = await supabaseClient
    .from('sommeil_nuit').upsert(row, { onConflict: 'resident_id,date' }).select();
  if (error) throw error;
  return _smFromRow(data[0]);
}

// Retirer le pointage (le veilleur s'est trompé de résident, ou revient à
// « non renseigné »).
async function sbDeleteSommeilNuit(residentId, date) {
  const { error } = await supabaseClient
    .from('sommeil_nuit').delete()
    .eq('resident_id', String(residentId)).eq('date', date);
  if (error) throw error;
}
