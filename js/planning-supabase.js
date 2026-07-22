// ── COUCHE DE CONNEXION SUPABASE — PLANNING (évènements résidents) ──
// sbGetEtablissementId() est défini dans js/residents-supabase.js (chargé avant ce fichier).
// Note : la colonne SQL "desc" était un mot réservé Postgres → colonne renommée "description".

function _pevToRow(e, etablissementId) {
  return {
    etablissement_id: etablissementId,
    titre: e.titre || '',
    resident_id: e.residentId || null,
    resident_name: e.residentName || '',
    type: e.type || '',
    date: e.date || '',
    heure: e.heure || e.time || '',
    duree: e.duree || '',
    color: safeColor(e.color) || '',
    description: e.desc || '',
    accompagnement: e.accompagnement || '',
    niveau_soutien: e.niveauSoutien || null,
    vehicule: e.vehicule || null,
    destination: e.destination || null,
    motif: e.motif || null,
    recur_id: e.recurId || null,
    recur_freq: e.recurFreq || null,
    recur_until: e.recurUntil || null,
    sante_rdv_id: e.santeRdvId || null,
    lieu: e.lieu || null,
    serafin: e.serafin || null,
    resident_ids: e.residentIds || [],
    resident_names: e.residentNames || [],
    date_end: e.dateEnd || null,
    time_end: e.timeEnd || null,
    reserved_by: e.reservedBy || null,
    reserved_prenom: e.reservedPrenom || null,
    // Colonnes migration-planning-v2.sql (voir _PEV_OPTIONAL_COLS).
    statut: e.statut || 'prevu',
    accompagnants: e.accompagnants || null,
    pieces_jointes: Array.isArray(e.piecesJointes) ? e.piecesJointes : []
  };
}

function _pevFromRow(r) {
  return {
    id: r.id, titre: r.titre,
    residentId: r.resident_id, residentName: r.resident_name,
    type: r.type, date: r.date,
    heure: r.heure, time: r.heure,
    duree: r.duree, color: safeColor(r.color, ''), desc: r.description,
    accompagnement: r.accompagnement || '', niveauSoutien: r.niveau_soutien || '',
    vehicule: r.vehicule, destination: r.destination, motif: r.motif,
    recurId: r.recur_id, recurFreq: r.recur_freq, recurUntil: r.recur_until,
    santeRdvId: r.sante_rdv_id,
    lieu: r.lieu, serafin: r.serafin,
    residentIds: r.resident_ids || [], residentNames: r.resident_names || [],
    dateEnd: r.date_end, timeEnd: r.time_end,
    reservedBy: r.reserved_by, reservedPrenom: r.reserved_prenom,
    statut: r.statut || 'prevu',
    accompagnants: r.accompagnants || '',
    piecesJointes: Array.isArray(r.pieces_jointes) ? r.pieces_jointes : []
  };
}

// Colonnes ajoutées par migration-planning-v2.sql. Tant que la migration n'est
// pas exécutée, ces colonnes sont absentes : on les retire et on réessaie, pour
// que l'enregistrement d'un événement ne casse pas (dégradation défensive).
const _PEV_OPTIONAL_COLS = ['statut', 'accompagnants', 'pieces_jointes'];
function _pevStripOptional(row) {
  const r = { ...row };
  _PEV_OPTIONAL_COLS.forEach(k => delete r[k]);
  return r;
}
function _pevIsMissingOptionalCol(error) {
  if (!error) return false;
  const m = ((error.message || '') + (error.hint || '') + (error.details || '')).toLowerCase();
  const named = _PEV_OPTIONAL_COLS.some(c => m.includes(c));
  return named && (m.includes('column') || m.includes('schema cache') || error.code === '42703' || error.code === 'PGRST204');
}

async function sbGetPlanningEvents() {
  try {
    // Lecture paginée : au-delà de 1000 lignes PostgREST tronque en silence.
    const data = await sbFetchAll(() => supabaseClient.from('planning_events').select('*').order('id', { ascending: true }));
    return data.map(_pevFromRow);
  } catch (error) { console.error(error); toast('Erreur de chargement du planning', 'error'); return []; }
}

async function sbSavePlanningEvent(ev) {
  const etablissementId = await sbGetEtablissementId();
  const row = _pevToRow(ev, etablissementId);
  const run = (r) => ev.id
    ? supabaseClient.from('planning_events').update(r).eq('id', ev.id).select()
    : supabaseClient.from('planning_events').insert(r).select();
  let { data, error } = await run(row);
  if (error && _pevIsMissingOptionalCol(error)) ({ data, error } = await run(_pevStripOptional(row)));
  if (error) throw error;
  if (ev.id && (!data || !data.length)) throw new Error('Aucune ligne mise à jour (id introuvable ou accès refusé) — id=' + ev.id);
  return _pevFromRow(data[0]);
}

async function sbSavePlanningEventsBulk(events) {
  const etablissementId = await sbGetEtablissementId();
  const rows = events.map(e => _pevToRow(e, etablissementId));
  let { data, error } = await supabaseClient.from('planning_events').insert(rows).select();
  if (error && _pevIsMissingOptionalCol(error)) ({ data, error } = await supabaseClient.from('planning_events').insert(rows.map(_pevStripOptional)).select());
  if (error) throw error;
  return data.map(_pevFromRow);
}

async function sbDeletePlanningEvent(id) {
  const { data, error } = await supabaseClient.from('planning_events').delete().eq('id', id).select();
  if (error) throw error;
  if (!data || !data.length) throw new Error('Aucune ligne supprimée (id introuvable ou accès refusé) — id=' + id);
}

async function sbDeletePlanningEventSeries(recurId) {
  const { data, error } = await supabaseClient.from('planning_events').delete().eq('recur_id', recurId).select();
  if (error) throw error;
  if (!data || !data.length) throw new Error('Aucune ligne supprimée (série introuvable ou accès refusé) — recurId=' + recurId);
}

// ── Session & pièces jointes (bucket privé "justificatifs") ──
// Ces helpers ne sont pas chargés ailleurs sur planning.html : on les définit ici.
// RÈGLE : le 1er dossier du chemin DOIT être auth.uid() (pas l'id legacy localStorage).
async function sbAuthUid() {
  try { const { data } = await supabaseClient.auth.getUser(); return (data && data.user && data.user.id) || null; }
  catch (e) { console.error('[sbAuthUid]', e); return null; }
}
async function sbPlanningUpload(file) {
  const uid = await sbAuthUid();
  if (!uid) throw new Error('Session requise pour l\'upload');
  const safe = (file.name || 'fichier').replace(/[^\w.\-]+/g, '_');
  const path = `${uid}/${Date.now()}_${safe}`;
  const { error } = await supabaseClient.storage.from('justificatifs')
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  return path;
}
async function sbPlanningFileUrl(path) {
  if (!path) return null;
  const { data, error } = await supabaseClient.storage.from('justificatifs').createSignedUrl(path, 120);
  if (error) { console.error(error); return null; }
  return data?.signedUrl || null;
}
async function sbPlanningFileDelete(path) {
  if (!path) return;
  try { await supabaseClient.storage.from('justificatifs').remove([path]); } catch (e) { console.error(e); }
}
