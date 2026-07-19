// ── COUCHE SUPABASE — PLAN DE SOINS ──
// sbGetEtablissementId() défini dans js/residents-supabase.js

// fait_le : date à laquelle le soin a été coché « fait » (checklist du jour).
// Écriture DÉFENSIVE : si la colonne n'existe pas encore (migration non exécutée),
// on la retire et on réessaie — les autres actions continuent de fonctionner.
let _psFaitColOk = true;

function _psToRow(p, etablissementId) {
  const row = {
    etablissement_id: etablissementId,
    resident_id:  p.residentId  || null,
    cat:          p.cat         || 'autre',
    freq:         p.freq        || 'quotidien',
    libelle:      p.libelle     || '',
    detail:       p.detail      || '',
    intervenant:  p.intervenant || '',
    note:         p.note        || '',
    actif:        p.actif !== false,
    fait_le:      p.faitLe      || null,
    updated_at:   new Date().toISOString()
  };
  if (!_psFaitColOk) delete row.fait_le;
  return row;
}

function _psFromRow(r) {
  return {
    id:          r.id,
    residentId:  r.resident_id || '',
    cat:         r.cat         || 'autre',
    freq:        r.freq        || 'quotidien',
    libelle:     r.libelle     || '',
    detail:      r.detail      || '',
    intervenant: r.intervenant || '',
    note:        r.note        || '',
    actif:       r.actif !== false,
    faitLe:      r.fait_le     || '',
    createdAt:   r.created_at,
    updatedAt:   r.updated_at
  };
}

function _psMissingFaitCol(error) {
  const m = ((error && (error.message || error.details || error.hint)) || '') + '';
  return /fait_le/i.test(m) && /(column|colonne|schema cache|does not exist|introuvable)/i.test(m);
}

async function sbGetPlanSoins() {
  const { data, error } = await supabaseClient
    .from('plan_soins')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); toast('Erreur chargement plan de soins', 'error'); return []; }
  return data.map(_psFromRow);
}

async function sbSavePlanSoins(p) {
  const etablissementId = await sbGetEtablissementId();
  async function attempt() {
    const row = _psToRow(p, etablissementId);
    if (p.id) return supabaseClient.from('plan_soins').update(row).eq('id', p.id).select();
    return supabaseClient.from('plan_soins').insert(row).select();
  }
  let { data, error } = await attempt();
  if (error && _psFaitColOk && _psMissingFaitCol(error)) {
    _psFaitColOk = false;                 // colonne fait_le absente : on réessaie sans elle
    ({ data, error } = await attempt());
  }
  if (error) throw error;
  if (!data || !data.length) throw new Error('Aucun soin ' + (p.id ? 'mis à jour — id=' + p.id : 'ajouté'));
  return _psFromRow(data[0]);
}

async function sbDeletePlanSoins(id) {
  const { data, error } = await supabaseClient
    .from('plan_soins').delete().eq('id', id).select();
  if (error) throw error;
  if (!data || !data.length) throw new Error('Aucun soin supprimé — id=' + id);
}
