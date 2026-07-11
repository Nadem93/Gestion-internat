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

// Écriture DÉFENSIVE : si les colonnes soutien/soutien_niveau n'existent pas encore
// (migration-transmissions-soutien.sql non exécutée), on réessaie sans elles pour ne
// jamais bloquer une transmission — avec un avertissement une seule fois.
let _trSoutienColOk = true;
function _trColManquante(error) {
  const msg = (error && (error.message || '') + ' ' + (error.code || '')).toLowerCase();
  return msg.includes('soutien') || (error && error.code === 'PGRST204');
}
async function sbSaveTransmission(t) {
  const etablissementId = await sbGetEtablissementId();
  const row = _trToRow(t, etablissementId);
  if (!_trSoutienColOk) { delete row.soutien; delete row.soutien_niveau; }
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
  try { return await run(row); }
  catch (e) {
    if (_trSoutienColOk && _trColManquante(e)) {
      _trSoutienColOk = false;
      console.warn('[transmissions] colonnes soutien absentes — exécuter migration-transmissions-soutien.sql', e);
      if (typeof toast === 'function') toast('Champ « accompagnement » non enregistré : exécutez migration-transmissions-soutien.sql', 'info');
      delete row.soutien; delete row.soutien_niveau;
      return await run(row);
    }
    throw e;
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
