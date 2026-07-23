// ── COUCHE SUPABASE — ABSENCES & ACCIDENTS DU TRAVAIL ──
// sbGetEtablissementId() défini dans js/residents-supabase.js

function _abToRow(a, etablissementId) {
  return {
    etablissement_id: etablissementId,
    employe_id:       a.employeId   ? String(a.employeId) : null,
    employe_nom:      a.employeNom  || '',
    type:             a.type        || 'maladie',
    debut:            a.debut       || null,
    fin:              a.fin         || null,
    prolongation:     !!a.prolongation,
    visite_date:      a.visiteDate  || null,
    visite_faite:     !!a.visiteFaite,
    declaree_cpam:    !!a.declareeCpam,
    justifie:         !!a.justifie,
    notes:            a.notes       || '',
    justificatif_path: a.justificatifPath || null,
    updated_at:       new Date().toISOString()
  };
}

function _abFromRow(r) {
  return {
    id:           r.id,
    employeId:    r.employe_id    || '',
    employeNom:   r.employe_nom   || '',
    type:         r.type,
    debut:        r.debut         || '',
    fin:          r.fin           || '',
    prolongation: !!r.prolongation,
    visiteDate:   r.visite_date   || '',
    visiteFaite:  !!r.visite_faite,
    declareeCpam: !!r.declaree_cpam,
    justifie:     !!r.justifie,
    notes:        r.notes         || '',
    justificatifPath: r.justificatif_path || '',
    createdAt:    r.created_at,
    updatedAt:    r.updated_at
  };
}

// uid réel du compte Supabase connecté (= auth.uid() = profiles.id).
// À utiliser comme 1er dossier des chemins Storage : la RLS du bucket "justificatifs"
// exige que le 1er segment du chemin soit auth.uid(). NE PAS utiliser Auth.getSession().userId
// (id legacy localStorage, pas garanti égal à auth.uid()).
async function sbAuthUid() {
  try {
    const { data } = await supabaseClient.auth.getUser();
    return (data && data.user && data.user.id) || null;
  } catch (e) { console.error('[sbAuthUid]', e); return null; }
}

// ── Stockage des justificatifs (bucket privé "justificatifs") ──
// Chemin = <uid uploadeur>/<timestamp>_<nom> ; le 1er dossier DOIT être l'uid de l'uploadeur (auth.uid()).
async function sbUploadJustificatif(file, profileId) {
  const safe = (file.name || 'fichier').replace(/[^\w.\-]+/g, '_');
  const path = `${profileId}/${Date.now()}_${safe}`;
  const { error } = await supabaseClient.storage.from('justificatifs')
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  return path;
}

async function sbJustificatifUrl(path) {
  if (!path) return null;
  const { data, error } = await supabaseClient.storage.from('justificatifs').createSignedUrl(path, 120);
  if (error) { console.error(error); return null; }
  return data?.signedUrl || null;
}

async function sbDeleteJustificatif(path) {
  if (!path) return;
  await supabaseClient.storage.from('justificatifs').remove([path]);
}

async function sbGetAbsences() {
  const { data, error } = await supabaseClient
    .from('absences_at')
    .select('*')
    .order('debut', { ascending: false });
  if (error) { console.error(error); toast('Erreur chargement absences', 'error'); return []; }
  return data.map(_abFromRow);
}

async function sbSaveAbsence(a) {
  const etablissementId = await sbGetEtablissementId();
  const row = _abToRow(a, etablissementId);
  if (a.id) {
    const { data, error } = await supabaseClient
      .from('absences_at').update(row).eq('id', a.id).select();
    if (error) throw error;
    if (!data || !data.length) throw new Error('Aucune ligne mise à jour — id=' + a.id);
    return _abFromRow(data[0]);
  }
  const { data, error } = await supabaseClient
    .from('absences_at').insert(row).select();
  if (error) throw error;
  return _abFromRow(data[0]);
}

async function sbDeleteAbsence(id) {
  const { data, error } = await supabaseClient
    .from('absences_at').delete().eq('id', id).select();
  if (error) throw error;
  if (!data || !data.length) throw new Error('Aucune ligne supprimée — id=' + id);
}
