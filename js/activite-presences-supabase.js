// ── COUCHE SUPABASE — PRÉSENCES AUX SÉANCES D'ACTIVITÉ ──
// Une ligne = un inscrit + une activité + une date. Complète l'inscription
// (residents.activites, qui ne connaît qu'active/terminee) par ce qui s'est
// réellement passé à la séance : présent, excusé ou absent.
//
// Dégradation douce : tant que migration-presences-activite.sql n'a pas été
// exécutée, la lecture renvoie [] avec un avertissement en console et la page
// reste utilisable ; l'écriture, elle, remonte l'erreur pour que l'appelant
// affiche un toast nommant le fichier SQL à exécuter.

const AP_SQL_FILE = 'migration-presences-activite.sql';

function _apFromRow(r) {
  return {
    id: r.id,
    activiteId: r.activite_id,
    residentId: r.resident_id,
    date: r.date,
    statut: r.statut || 'present',
    note: r.note || '',
    createdBy: r.created_by || '',
    createdAt: r.created_at
  };
}

// Pointages d'une séance (une activité, une date). Renvoie TOUJOURS un tableau.
async function sbGetPresencesActivite(activiteId, date) {
  try {
    const { data, error } = await supabaseClient
      .from('activite_presences').select('*')
      .eq('activite_id', String(activiteId)).eq('date', date);
    if (error) throw error;
    return (data || []).map(_apFromRow);
  } catch (e) {
    console.warn(`[activite_presences] lecture impossible (${AP_SQL_FILE} exécutée ?)`, e);
    return [];
  }
}

// Historique d'un résident sur une plage — utile pour un bilan.
// Même dégradation douce.
async function sbGetPresencesActiviteResident(residentId, startDate, endDate) {
  try {
    let q = supabaseClient.from('activite_presences').select('*')
      .eq('resident_id', String(residentId));
    if (startDate) q = q.gte('date', startDate);
    if (endDate) q = q.lte('date', endDate);
    const { data, error } = await q.order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(_apFromRow);
  } catch (e) {
    console.warn(`[activite_presences] lecture impossible (${AP_SQL_FILE} exécutée ?)`, e);
    return [];
  }
}

// created_by stocke l'UID d'authentification (pas session.userId, identifiant
// hérité et différent) : c'est lui que la politique RLS de suppression compare
// à auth.uid().
async function _apAuthUid() {
  try {
    const { data } = await supabaseClient.auth.getUser();
    return (data && data.user && data.user.id) || null;
  } catch (e) { console.error('[activite_presences] uid', e); return null; }
}

// Pointage d'un inscrit. Upsert sur (activite_id, resident_id, date).
async function sbSetPresenceActivite(activiteId, residentId, date, statut, note) {
  const [etablissementId, uid] = await Promise.all([sbGetEtablissementId(), _apAuthUid()]);
  const row = {
    etablissement_id: etablissementId,
    activite_id: String(activiteId),
    resident_id: String(residentId),
    date,
    statut,
    created_by: uid
  };
  if (note !== undefined) row.note = note || null;
  const { data, error } = await supabaseClient
    .from('activite_presences')
    .upsert(row, { onConflict: 'activite_id,resident_id,date' })
    .select();
  if (error) throw error;
  return data && data[0] ? _apFromRow(data[0]) : null;
}

// Dé-pointer : on retire la ligne, l'inscrit repasse « non pointé ».
async function sbDeletePresenceActivite(activiteId, residentId, date) {
  const { error } = await supabaseClient
    .from('activite_presences').delete()
    .eq('activite_id', String(activiteId))
    .eq('resident_id', String(residentId))
    .eq('date', date);
  if (error) throw error;
}
