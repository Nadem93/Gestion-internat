// ── COUCHE SUPABASE — CHAMBRES & ÉTATS DES LIEUX ──
// sbGetEtablissementId() défini dans js/residents-supabase.js
// Fait le pont entre le format chambres.js (camelCase) et les colonnes Postgres (snake_case).

// ── CHAMBRES ──
function _chToRow(c, etablissementId) {
  return {
    etablissement_id: etablissementId,
    nom:              c.nom   || '',
    unite:            c.unite || '',
    capacite:         Math.max(parseInt(c.capacite) || 1, 1),
    notes:            c.notes || '',
    updated_at:       new Date().toISOString()
  };
}

function _chFromRow(r) {
  return {
    id:        r.id,
    nom:       r.nom   || '',
    unite:     r.unite || '',
    capacite:  r.capacite || 1,
    notes:     r.notes || '',
    // `select('*')` rapatrie déjà cette colonne : la jeter obligeait à relire
    // toute la table juste pour elle (voir loadChambresDatesAttribution).
    dateAttribution: r.date_attribution || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

// La colonne date_attribution n'existe qu'après la migration SQL. On note sa
// présence ici plutôt que de la sonder par une seconde requête.
let sbChambresDateAttrPresente = true;

async function sbGetChambres() {
  const { data, error } = await supabaseClient
    .from('chambres')
    .select('*')
    .order('nom', { ascending: true });
  if (error) { console.error(error); toast('Erreur chargement chambres', 'error'); return []; }
  if (data.length) sbChambresDateAttrPresente = ('date_attribution' in data[0]);
  return data.map(_chFromRow);
}

async function sbSaveChambre(c) {
  const etablissementId = await sbGetEtablissementId();
  const row = _chToRow(c, etablissementId);
  if (c.id) {
    const { data, error } = await supabaseClient
      .from('chambres').update(row).eq('id', c.id).select();
    if (error) throw error;
    if (!data || !data.length) throw new Error('Aucune chambre mise à jour — id=' + c.id);
    return _chFromRow(data[0]);
  }
  const { data, error } = await supabaseClient
    .from('chambres').insert(row).select();
  if (error) throw error;
  return _chFromRow(data[0]);
}

async function sbDeleteChambre(id) {
  const { data, error } = await supabaseClient
    .from('chambres').delete().eq('id', id).select();
  if (error) throw error;
  if (!data || !data.length) throw new Error('Aucune chambre supprimée — id=' + id);
}

// ── ÉTATS DES LIEUX (append-only) ──
function _edlToRow(e, etablissementId) {
  return {
    etablissement_id: etablissementId,
    chambre_id:       e.chambreId   || null,
    chambre_nom:      e.chambreNom  || '',
    resident_id:      e.residentId  || null,
    resident_name:    e.residentName|| '',
    type:             e.type        || 'entree',
    date:             e.date        || null,
    etat:             e.etat        || {},
    observations:     e.observations|| '',
    author:           e.author      || ''
  };
}

function _edlFromRow(r) {
  return {
    id:           r.id,
    chambreId:    r.chambre_id    || '',
    chambreNom:   r.chambre_nom   || '',
    residentId:   r.resident_id   || '',
    residentName: r.resident_name || '',
    type:         r.type          || 'entree',
    date:         r.date          || '',
    etat:         r.etat          || {},
    observations: r.observations  || '',
    author:       r.author        || '',
    createdAt:    r.created_at
  };
}

async function sbGetEdl() {
  const { data, error } = await supabaseClient
    .from('etats_lieux')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); toast('Erreur chargement états des lieux', 'error'); return []; }
  return data.map(_edlFromRow);
}

async function sbSaveEdl(e) {
  const etablissementId = await sbGetEtablissementId();
  const row = _edlToRow(e, etablissementId);
  const { data, error } = await supabaseClient
    .from('etats_lieux').insert(row).select();
  if (error) throw error;
  return _edlFromRow(data[0]);
}
