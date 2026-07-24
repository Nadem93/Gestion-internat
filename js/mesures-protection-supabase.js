// ── COUCHE SUPABASE — MESURES DE PROTECTION JURIDIQUE ──
// sbGetEtablissementId() défini dans js/residents-supabase.js (charger avant).
// La date de renouvellement alimente automatiquement la table `echeances`
// (source_id = 'protj_<id>') → apparaît dans les alertes sans code d'alerte.

const MP_TYPES = {
  tutelle:      { l: 'Tutelle',                 c: '#ef4444' },
  curatelle:    { l: 'Curatelle',               c: '#f59e0b' },
  sauvegarde:   { l: 'Sauvegarde de justice',   c: '#818cf8' },
  habilitation: { l: 'Habilitation familiale',  c: '#0d9488' },
  masp:         { l: 'MASP / MAJ',              c: '#0891b2' },
  autre:        { l: 'Autre mesure',            c: '#64748b' }
};
const mpLabel = t => (MP_TYPES[t] || MP_TYPES.autre).l;
const mpColor = t => (MP_TYPES[t] || MP_TYPES.autre).c;

function _mpToRow(m, etablissementId) {
  return {
    etablissement_id:     etablissementId,
    resident_id:          m.residentId || null,
    type:                 m.type || 'tutelle',
    mandataire_nom:       m.mandataireNom || '',
    mandataire_organisme: m.mandataireOrganisme || '',
    mandataire_tel:       m.mandataireTel || '',
    mandataire_email:     m.mandataireEmail || '',
    tribunal:             m.tribunal || '',
    date_jugement:        m.dateJugement || null,
    date_debut:           m.dateDebut || null,
    date_renouvellement:  m.dateRenouvellement || null,
    date_audience:        m.dateAudience || null,
    statut:               m.statut || 'active',
    notes:                m.notes || '',
    updated_at:           new Date().toISOString()
  };
}

function _mpFromRow(r) {
  return {
    id:                  r.id,
    residentId:          r.resident_id || '',
    type:                r.type || 'tutelle',
    mandataireNom:       r.mandataire_nom || '',
    mandataireOrganisme: r.mandataire_organisme || '',
    mandataireTel:       r.mandataire_tel || '',
    mandataireEmail:     r.mandataire_email || '',
    tribunal:            r.tribunal || '',
    dateJugement:        r.date_jugement || '',
    dateDebut:           r.date_debut || '',
    dateRenouvellement:  r.date_renouvellement || '',
    dateAudience:        r.date_audience || '',
    statut:              r.statut || 'active',
    notes:               r.notes || '',
    createdAt:           r.created_at
  };
}

async function sbGetMesuresProtection() {
  const { data, error } = await supabaseClient
    .from('mesures_protection')
    .select('*')
    .order('date_renouvellement', { ascending: true, nullsFirst: false });
  if (error) { console.error(error); toast('Erreur chargement mesures de protection', 'error'); return []; }
  return data.map(_mpFromRow);
}

async function sbSaveMesureProtection(m) {
  const etablissementId = await sbGetEtablissementId();
  const row = _mpToRow(m, etablissementId);
  let saved;
  if (m.id) {
    const { data, error } = await supabaseClient
      .from('mesures_protection').update(row).eq('id', m.id).select();
    if (error) throw error;
    if (!data || !data.length) throw new Error('Aucune mesure mise à jour — id=' + m.id);
    saved = _mpFromRow(data[0]);
  } else {
    const { data, error } = await supabaseClient
      .from('mesures_protection').insert(row).select();
    if (error) throw error;
    saved = _mpFromRow(data[0]);
  }
  // Alerte de renouvellement (via la table échéances générique)
  await _mpSyncEcheance(saved, m.residentName);
  return saved;
}

async function sbDeleteMesureProtection(id) {
  const { data, error } = await supabaseClient
    .from('mesures_protection').delete().eq('id', id).select();
  if (error) throw error;
  if (!data || !data.length) throw new Error('Aucune mesure supprimée — id=' + id);
  try { if (typeof sbDeleteEcheancesBySource === 'function') await sbDeleteEcheancesBySource('protj_' + id); } catch (e) { console.warn(e); }
}

// Crée / met à jour / supprime l'échéance de renouvellement liée à la mesure.
async function _mpSyncEcheance(m, residentName) {
  if (typeof sbSaveEcheance !== 'function') return;
  const src = 'protj_' + m.id;
  try {
    if (m.dateRenouvellement && m.statut !== 'terminee') {
      let existingId;
      try {
        const all = await sbGetEcheances();
        const ex = all.find(e => e.sourceId === src);
        if (ex) existingId = ex.id;
      } catch (e) { /* ignore */ }
      await sbSaveEcheance({
        id:           existingId,
        type:         'jugement',
        libelle:      'Renouvellement ' + mpLabel(m.type) + (m.mandataireNom ? ' — ' + m.mandataireNom : ''),
        date:         m.dateRenouvellement,
        residentId:   m.residentId,
        residentName: residentName || '',
        sourceId:     src
      });
    } else if (typeof sbDeleteEcheancesBySource === 'function') {
      await sbDeleteEcheancesBySource(src);
    }
  } catch (e) { console.warn('[mp] sync échéance', e); }
}

// ── Cache mémoire (comme documents-resident-supabase.js) ──
let _mpCache = [];
async function loadMesuresProtectionCache() { _mpCache = await sbGetMesuresProtection(); return _mpCache; }
function mesuresProtectionAll() { return _mpCache; }
function mesuresByResident(rid) { return _mpCache.filter(m => String(m.residentId) === String(rid)); }
