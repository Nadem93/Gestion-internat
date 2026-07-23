// ── COUCHE SUPABASE — RÉPERTOIRE (contacts partenaires) ──
// sbGetEtablissementId() défini dans js/residents-supabase.js

function _repToRow(c, etablissementId) {
  return {
    etablissement_id: etablissementId,
    organisme:  c.organisme || '',
    nom:        c.nom       || '',
    tel:        c.tel       || '',
    email:      c.email     || '',
    fonction:   c.fonction  || '',
    adresse:    c.adresse   || '',
    notes:      c.notes     || '',
    updated_at: new Date().toISOString()
  };
}

function _repFromRow(r) {
  return {
    id:        r.id,
    organisme: r.organisme || '',
    nom:       r.nom       || '',
    tel:       r.tel       || '',
    email:     r.email     || '',
    fonction:  r.fonction  || '',
    adresse:   r.adresse   || '',
    notes:     r.notes     || '',
    createdBy: r.created_by != null ? String(r.created_by) : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at || r.created_at
  };
}

async function sbGetRepertoire() {
  const { data, error } = await supabaseClient
    .from('repertoire')
    .select('*')
    .order('organisme', { ascending: true });
  if (error) { console.error(error); toast('Erreur chargement répertoire', 'error'); return []; }
  return data.map(_repFromRow);
}

async function sbSaveRepertoire(c) {
  const etablissementId = await sbGetEtablissementId();
  const row = _repToRow(c, etablissementId);
  if (c.id) {
    // On ne réécrit jamais l'auteur d'origine lors d'une modification.
    delete row.created_by;
    const { data, error } = await supabaseClient
      .from('repertoire').update(row).eq('id', c.id).select();
    if (error) throw error;
    if (!data || !data.length) throw new Error('Aucun contact mis à jour — id=' + c.id);
    return _repFromRow(data[0]);
  }
  // À la création : on mémorise l'auteur (compte connecté) pour le contrôle d'édition.
  row.created_by = c.createdBy != null ? String(c.createdBy) : null;
  let ins = await supabaseClient.from('repertoire').insert(row).select();
  // Filet de sécurité : si la migration n'a pas encore été exécutée (colonne
  // created_by absente), on réinsère sans l'auteur plutôt que d'échouer.
  if (ins.error && (ins.error.code === '42703' || /created_by/.test(ins.error.message || ''))) {
    delete row.created_by;
    ins = await supabaseClient.from('repertoire').insert(row).select();
  }
  if (ins.error) throw ins.error;
  return _repFromRow(ins.data[0]);
}

async function sbDeleteRepertoire(id) {
  const { data, error } = await supabaseClient
    .from('repertoire').delete().eq('id', id).select();
  if (error) throw error;
  if (!data || !data.length) throw new Error('Aucun contact supprimé — id=' + id);
}
