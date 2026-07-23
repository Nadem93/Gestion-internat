// ── COUCHE SUPABASE — TRANSMISSIONS ──
// sbGetEtablissementId() défini dans js/residents-supabase.js

function _trToRow(t, etablissementId) {
  return {
    etablissement_id: etablissementId,
    date:             t.date        || '',
    shift:            t.shift       || 'matin',
    cat:              t.cat         || 'administratif',
    priority:         t.priority    || 'normal',
    content:          t.content     || '',
    resident_id:      t.residentId  || null,
    resident_name:    t.residentName|| '',
    author_id:        String(t.authorId  || ''),
    author_name:      t.authorName  || '',
    read_by:          t.readBy      || [],
    replies:          t.replies     || [],
    incident_id:      t.incidentId  || null,
    journal_entry_id: t.journalEntryId || null,
    soutien:          t.soutien      || '',
    soutien_niveau:   t.soutienNiveau || '',
    // Suivi « à faire pour la relève » (migration-fonctionnalites-v2.sql)
    suivi:            t.aFaire ? true : false,
    suivi_fait:       t.fait   ? true : false,
    suivi_par:        t.faitPar || null,
    suivi_le:         t.faitLe  || null,
    created_at:       t.createdAt   || new Date().toISOString(),
    updated_at:       t.updatedAt   || null
  };
}

function _trFromRow(r) {
  return {
    id:             r.id,
    date:           r.date,
    shift:          r.shift,
    cat:            r.cat,
    priority:       r.priority,
    content:        r.content,
    residentId:     r.resident_id    || '',
    residentName:   r.resident_name  || '',
    authorId:       r.author_id,
    authorName:     r.author_name,
    readBy:         r.read_by        || [],
    replies:        r.replies        || [],
    incidentId:     r.incident_id    || null,
    journalEntryId: r.journal_entry_id || null,
    soutien:        r.soutien        || '',
    soutienNiveau:  r.soutien_niveau || '',
    aFaire:         !!r.suivi,
    fait:           !!r.suivi_fait,
    faitPar:        r.suivi_par      || '',
    faitLe:         r.suivi_le       || null,
    createdAt:      r.created_at,
    updatedAt:      r.updated_at
  };
}

async function sbGetTransmissions() {
  const { data, error } = await supabaseClient
    .from('transmissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); toast('Erreur chargement transmissions', 'error'); return []; }
  return data.map(_trFromRow);
}

// Écriture DÉFENSIVE : les colonnes ajoutées par migration (accompagnement, puis
// suivi « à faire ») peuvent ne pas encore exister en base. Plutôt que de bloquer
// une transmission, on retire le groupe de colonnes fautif et on réessaie — avec
// un avertissement une seule fois par groupe.
const _TR_EXTRAS = {
  soutien: { cols: ['soutien', 'soutien_niveau'],
             sql: 'migration-transmissions-soutien.sql', libelle: 'accompagnement' },
  suivi:   { cols: ['suivi', 'suivi_fait', 'suivi_par', 'suivi_le'],
             sql: 'migration-fonctionnalites-v2.sql', libelle: 'suivi à faire' }
};
const _trColOk = { soutien: true, suivi: true };

function _trStripExtras(row) {
  Object.keys(_TR_EXTRAS).forEach(k => {
    if (!_trColOk[k]) _TR_EXTRAS[k].cols.forEach(c => delete row[c]);
  });
}
function _trSchemaErr(error) {
  const msg = ((error && error.message) || '').toLowerCase();
  return (error && error.code === 'PGRST204') || /column .* does not exist|schema cache/.test(msg);
}

async function sbSaveTransmission(t) {
  const etablissementId = await sbGetEtablissementId();
  const row = _trToRow(t, etablissementId);
  _trStripExtras(row);

  const run = async r => {
    if (t.id) {
      const { data, error } = await supabaseClient
        .from('transmissions').update(r).eq('id', t.id).select();
      if (error) throw error;
      if (!data || !data.length) throw new Error('Aucune ligne mise à jour — id=' + t.id);
      return _trFromRow(data[0]);
    }
    const { data, error } = await supabaseClient
      .from('transmissions').insert(r).select();
    if (error) throw error;
    return _trFromRow(data[0]);
  };

  for (let essai = 0; essai < 3; essai++) {
    try { return await run(row); }
    catch (e) {
      if (!_trSchemaErr(e)) throw e;
      const msg = (((e && e.message) || '') + '').toLowerCase();
      // On désactive le groupe nommé dans l'erreur ; à défaut, le prochain
      // groupe encore actif (par prudence).
      let touche = false;
      Object.keys(_TR_EXTRAS).forEach(k => {
        if (_trColOk[k] && _TR_EXTRAS[k].cols.some(c => msg.includes(c))) { _trColOk[k] = false; touche = true; }
      });
      if (!touche) {
        const k = Object.keys(_TR_EXTRAS).find(k => _trColOk[k]);
        if (k) { _trColOk[k] = false; touche = true; }
      }
      if (!touche) throw e;
      const k = Object.keys(_TR_EXTRAS).find(k => !_trColOk[k] && _TR_EXTRAS[k].cols.some(c => msg.includes(c)))
                || Object.keys(_TR_EXTRAS).find(k => !_trColOk[k]);
      const info = _TR_EXTRAS[k];
      console.warn(`[transmissions] colonnes « ${info.libelle} » absentes — exécuter ${info.sql}`, e);
      if (typeof toast === 'function') toast(`Champ « ${info.libelle} » non enregistré : exécutez ${info.sql}`, 'info');
      _trStripExtras(row);
    }
  }
}

async function sbDeleteTransmission(id) {
  const { data, error } = await supabaseClient
    .from('transmissions').delete().eq('id', id).select();
  if (error) throw error;
  if (!data || !data.length) throw new Error('Aucune ligne supprimée — id=' + id);
}

async function sbUpdateTransmissionField(id, fields) {
  const { data, error } = await supabaseClient
    .from('transmissions').update(fields).eq('id', id).select();
  if (error) throw error;
  if (!data || !data.length) throw new Error('Mise à jour échouée — id=' + id);
  return _trFromRow(data[0]);
}
