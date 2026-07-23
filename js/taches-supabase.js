// ── COUCHE SUPABASE — TÂCHES DU PROJET PERSONNALISÉ (vue « Journée / Ma tournée ») ──
// sbGetEtablissementId() défini dans js/residents-supabase.js
// Tables : taches_ppa (les tâches récurrentes), taches_coches (journal par jour).

function _tpToRow(t, etablissementId) {
  return {
    etablissement_id: etablissementId,
    resident_id:     String(t.residentId || ''),
    resident_name:   t.residentName || '',
    libelle:         t.libelle || '',
    objectif:        t.objectif || '',
    ppe_id:          t.ppeId || null,
    moment:          t.moment || 'matin',
    heure:           t.heure || '',
    recurrence:      t.recurrence || { type: 'quotidien' },
    consigne:        t.consigne || '',
    soutien_attendu: t.soutienAttendu || '',
    actif:           t.actif !== false,
    created_by:      t.createdBy || '',
    updated_at:      new Date().toISOString()
  };
}

function _tpFromRow(r) {
  return {
    id:             r.id,
    residentId:     r.resident_id || '',
    residentName:   r.resident_name || '',
    libelle:        r.libelle || '',
    objectif:       r.objectif || '',
    ppeId:          r.ppe_id || null,
    moment:         r.moment || 'matin',
    heure:          r.heure || '',
    recurrence:     r.recurrence || { type: 'quotidien' },
    consigne:       r.consigne || '',
    soutienAttendu: r.soutien_attendu || '',
    actif:          r.actif !== false,
    createdBy:      r.created_by || '',
    createdAt:      r.created_at
  };
}

function _tcFromRow(r) {
  return {
    id:      r.id,
    tacheId: r.tache_id,
    date:    r.date,
    statut:  r.statut || 'fait',
    motif:   r.motif || '',
    soutien: r.soutien || '',
    par:     r.par || '',
    parId:   r.par_id || '',
    doneAt:  r.done_at
  };
}

async function sbGetTaches() {
  const { data, error } = await supabaseClient
    .from('taches_ppa')
    .select('*')
    .eq('actif', true)
    .order('heure', { ascending: true });
  if (error) throw error;   // initJournee affiche l'écran d'erreur (migration absente, réseau…)
  return data.map(_tpFromRow);
}

async function sbSaveTache(t) {
  const etablissementId = await sbGetEtablissementId();
  const row = _tpToRow(t, etablissementId);
  if (t.id) {
    const { data, error } = await supabaseClient
      .from('taches_ppa').update(row).eq('id', t.id).select();
    if (error) throw error;
    if (!data || !data.length) throw new Error('Aucune tâche mise à jour — id=' + t.id);
    return _tpFromRow(data[0]);
  }
  const { data, error } = await supabaseClient
    .from('taches_ppa').insert(row).select();
  if (error) throw error;
  return _tpFromRow(data[0]);
}

// Désactivation douce (l'historique des coches est conservé)
async function sbArchiveTache(id) {
  const { error } = await supabaseClient
    .from('taches_ppa').update({ actif: false, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

async function sbGetCoches(date) {
  const { data, error } = await supabaseClient
    .from('taches_coches')
    .select('*')
    .eq('date', date);
  if (error) throw error;   // ne JAMAIS afficher des tâches « à refaire » sur une lecture en échec
  return data.map(_tcFromRow);
}

// Coches sur une plage de dates — pour agréger le niveau de soutien récent (ex. tableau de bord).
// Lecture non critique : renvoie [] en cas d'erreur (contrairement à sbGetCoches qui lève).
async function sbGetCochesRange(startDate, endDate) {
  const { data, error } = await supabaseClient
    .from('taches_coches')
    .select('*')
    .gte('date', startDate).lte('date', endDate);
  if (error) { console.error(error); return []; }
  return data.map(_tcFromRow);
}

// Map { tacheId : residentId } de TOUTES les tâches (actives ou non) — une coche ne porte pas
// le résident (seulement tache_id), il faut donc passer par sa tâche pour le retrouver.
async function sbGetTacheResidentMap() {
  const { data, error } = await supabaseClient
    .from('taches_ppa')
    .select('id, resident_id');
  if (error) { console.error(error); return {}; }
  const map = {};
  (data || []).forEach(t => { map[String(t.id)] = t.resident_id || ''; });
  return map;
}

// Pose/actualise la coche du jour (unicité tache_id+date garantie côté SQL)
async function sbSetCoche(c) {
  const etablissementId = await sbGetEtablissementId();
  const row = {
    etablissement_id: etablissementId,
    tache_id: c.tacheId,
    date:     c.date,
    statut:   c.statut || 'fait',
    motif:    c.motif || '',
    soutien:  c.soutien || '',
    par:      c.par || '',
    par_id:   String(c.parId || ''),
    done_at:  new Date().toISOString()
  };
  const { data, error } = await supabaseClient
    .from('taches_coches')
    .upsert(row, { onConflict: 'tache_id,date' })
    .select();
  if (error) throw error;
  return _tcFromRow(data[0]);
}

async function sbClearCoche(tacheId, date) {
  const { error } = await supabaseClient
    .from('taches_coches').delete().eq('tache_id', tacheId).eq('date', date);
  if (error) throw error;
}
