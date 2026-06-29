// ── COUCHE SUPABASE — INTERVENTIONS (maintenance / technique) ──
// sbGetEtablissementId() défini dans js/residents-supabase.js
// La photo des travaux (preuve, faible volume) est stockée en base64 dans la colonne photo_travaux.

let _intCache = [];
function getInterventionsCache() { return _intCache; }
async function loadInterventionsCache() { _intCache = await sbGetInterventions(); }

function _intToRow(i, etablissementId) {
  return {
    etablissement_id: etablissementId,
    lieu:                i.lieu              || '',
    description:         i.desc              || '',
    urgence:             i.urgence           || 'normale',
    statut:              i.statut            || 'ouverte',
    demande_par:         i.demandePar        || '',
    traite_par:          i.traitePar         || '',
    date_traitement:     i.dateTraitement    || null,
    photo_travaux:       i.photoTravaux      || null,
    commentaire_travaux: i.commentaireTravaux || '',
    updated_at:          new Date().toISOString()
  };
}

function _intFromRow(r) {
  return {
    id:                 r.id,
    lieu:               r.lieu                || '',
    desc:               r.description         || '',
    urgence:            r.urgence             || 'normale',
    statut:             r.statut              || 'ouverte',
    demandePar:         r.demande_par         || '',
    traitePar:          r.traite_par          || '',
    dateTraitement:     r.date_traitement     || '',
    photoTravaux:       r.photo_travaux       || '',
    commentaireTravaux: r.commentaire_travaux || '',
    date:               r.created_at
  };
}

async function sbGetInterventions() {
  const { data, error } = await supabaseClient
    .from('interventions')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error(error); toast('Erreur chargement interventions', 'error'); return []; }
  return data.map(_intFromRow);
}

async function sbSaveIntervention(i) {
  const etablissementId = await sbGetEtablissementId();
  const row = _intToRow(i, etablissementId);
  if (i.id) {
    const { data, error } = await supabaseClient
      .from('interventions').update(row).eq('id', i.id).select();
    if (error) throw error;
    if (!data || !data.length) throw new Error('Aucune intervention mise à jour — id=' + i.id);
    return _intFromRow(data[0]);
  }
  const { data, error } = await supabaseClient
    .from('interventions').insert(row).select();
  if (error) throw error;
  return _intFromRow(data[0]);
}

async function sbDeleteIntervention(id) {
  const { data, error } = await supabaseClient
    .from('interventions').delete().eq('id', id).select();
  if (error) throw error;
  if (!data || !data.length) throw new Error('Aucune intervention supprimée — id=' + id);
}
