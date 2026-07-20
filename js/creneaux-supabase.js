// ── COUCHE SUPABASE — CRÉNEAUX DU SALON FAMILLE ──
// Une ligne de `creneaux_salon` = un créneau réservé. Le « libre » n'est pas
// stocké : c'est l'absence de réservation sur la plage affichée par la page.
// Libérer un créneau = supprimer la ligne.
//
// Dégradation douce : tant que migration-creneaux-salon.sql n'a pas été
// exécuté, la lecture renvoie [] avec un console.warn et la page reste
// utilisable ; l'écriture remonte une erreur nommant le fichier SQL.

const CRENEAUX_SQL_FILE = 'migration-creneaux-salon.sql';

function _crnFromRow(r) {
  return {
    id: r.id,
    date: r.date || '',
    heureDebut: (r.heure_debut || '').slice(0, 5),
    heureFin: (r.heure_fin || '').slice(0, 5),
    salle: r.salle || 'Salon famille',
    visiteId: r.visite_id || '',
    reservePar: r.reserve_par || '',
    createdBy: r.created_by || '',
    createdAt: r.created_at
  };
}

// created_by stocke l'UID d'authentification, pas session.userId (identifiant
// hérité, différent) : c'est lui que la politique RLS compare à auth.uid().
async function _crnAuthUid() {
  try {
    const { data } = await supabaseClient.auth.getUser();
    return (data && data.user && data.user.id) || null;
  } catch (e) { console.error('[creneaux] uid', e); return null; }
}

// Table absente : 42P01 côté Postgres, PGRST205 quand PostgREST ne la trouve
// pas dans son cache de schéma. Tout le reste (RLS, contrainte…) reste une
// erreur ordinaire : on ne veut pas envoyer l'utilisateur exécuter un SQL
// déjà exécuté.
function _crnIsMissingTable(e) {
  const code = (e && e.code) || '';
  return code === '42P01' || code === 'PGRST205'
    || /creneaux_salon/i.test((e && e.message) || '') && /does not exist|schema cache/i.test((e && e.message) || '');
}
function _crnWrap(e) {
  const err = new Error((e && e.message) || 'Erreur créneaux');
  err.crnMissingTable = _crnIsMissingTable(e);
  err.cause = e;
  return err;
}

async function sbGetCreneauxSalon(date) {
  try {
    let q = supabaseClient.from('creneaux_salon').select('*');
    if (date) q = q.eq('date', date);
    const { data, error } = await q.order('heure_debut', { ascending: true });
    if (error) throw error;
    return (data || []).map(_crnFromRow);
  } catch (e) {
    console.warn(`[creneaux] lecture impossible (${CRENEAUX_SQL_FILE} exécuté ?)`, e);
    return [];
  }
}

async function sbSaveCreneauSalon(c) {
  const [etablissementId, uid] = await Promise.all([sbGetEtablissementId(), _crnAuthUid()]);
  const row = {
    etablissement_id: etablissementId,
    date: c.date || null,
    heure_debut: c.heureDebut || null,
    heure_fin: c.heureFin || null,
    salle: c.salle || 'Salon famille',
    visite_id: c.visiteId || null,
    reserve_par: c.reservePar || '',
    created_by: uid
  };
  const { data, error } = await supabaseClient.from('creneaux_salon').insert(row).select();
  if (error) throw _crnWrap(error);
  return _crnFromRow(data[0]);
}

async function sbDeleteCreneauSalon(id) {
  const { error } = await supabaseClient.from('creneaux_salon').delete().eq('id', id);
  if (error) throw _crnWrap(error);
}
