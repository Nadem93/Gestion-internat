// ── COUCHE SUPABASE — PLAN DE SOINS ──
// sbGetEtablissementId() défini dans js/residents-supabase.js

function _psToRow(p, etablissementId) {
  return {
    etablissement_id: etablissementId,
    resident_id:  p.residentId  || null,
    cat:          p.cat         || 'autre',
    freq:         p.freq        || 'quotidien',
    libelle:      p.libelle     || '',
    detail:       p.detail      || '',
    intervenant:  p.intervenant || '',
    note:         p.note        || '',
    actif:        p.actif !== false,
    updated_at:   new Date().toISOString()
  };
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
    createdAt:   r.created_at,
    updatedAt:   r.updated_at
  };
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
  const row = _psToRow(p, etablissementId);
  if (p.id) {
    const { data, error } = await supabaseClient
      .from('plan_soins').update(row).eq('id', p.id).select();
    if (error) throw error;
    if (!data || !data.length) throw new Error('Aucun soin mis à jour — id=' + p.id);
    return _psFromRow(data[0]);
  }
  const { data, error } = await supabaseClient
    .from('plan_soins').insert(row).select();
  if (error) throw error;
  return _psFromRow(data[0]);
}

async function sbDeletePlanSoins(id) {
  const { data, error } = await supabaseClient
    .from('plan_soins').delete().eq('id', id).select();
  if (error) throw error;
  if (!data || !data.length) throw new Error('Aucun soin supprimé — id=' + id);
  // Nettoie les coches associées (pas de contrainte FK côté base)
  try { await supabaseClient.from('plan_soins_coches').delete().eq('soin_id', String(id)); } catch (e) { /* table absente ou rien à supprimer */ }
}

// ── COCHES « FAIT » — traçabilité (qui, à quelle heure, historique par jour) ──
// Table plan_soins_coches (clé : soin_id + date). Présence d'une ligne = soin fait ce jour-là.
function _pscFromRow(r) {
  return { soinId: r.soin_id, date: r.date, par: r.par || '', parId: r.par_id || '', doneAt: r.done_at };
}

async function sbGetPsCoches(date) {
  const { data, error } = await supabaseClient
    .from('plan_soins_coches').select('*').eq('date', date);
  if (error) { console.error('[sbGetPsCoches]', error); return []; }   // lecture non critique
  return (data || []).map(_pscFromRow);
}

// Plage de dates — pour l'historique / les agrégats.
async function sbGetPsCochesRange(startDate, endDate) {
  const { data, error } = await supabaseClient
    .from('plan_soins_coches').select('*').gte('date', startDate).lte('date', endDate);
  if (error) { console.error('[sbGetPsCochesRange]', error); return []; }
  return (data || []).map(_pscFromRow);
}

// Marque un soin « fait » un jour donné (avec l'auteur), unicité soin_id+date garantie côté SQL.
async function sbSetPsCoche(c) {
  const etablissementId = await sbGetEtablissementId();
  const row = {
    soin_id:  String(c.soinId),
    date:     c.date,
    par:      c.par || '',
    par_id:   String(c.parId || ''),
    done_at:  new Date().toISOString(),
    etablissement_id: etablissementId
  };
  const { data, error } = await supabaseClient
    .from('plan_soins_coches').upsert(row, { onConflict: 'soin_id,date' }).select();
  if (error) throw error;
  return _pscFromRow(data[0]);
}

async function sbClearPsCoche(soinId, date) {
  const { error } = await supabaseClient
    .from('plan_soins_coches').delete().eq('soin_id', String(soinId)).eq('date', date);
  if (error) throw error;
}
