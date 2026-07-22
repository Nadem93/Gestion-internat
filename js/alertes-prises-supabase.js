// ── PRISE EN CHARGE DES ALERTES (Supabase) ──
// Table public.alertes_prises (voir migration-fonctionnalites-v2.sql).
// Trace qui prend en charge quelle alerte, pour que l'équipe sache qui traite
// quoi. Les alertes sont calculées à la volée (id = « type::ref », donc TEXT).
// Dégradation douce : table absente ou erreur → la prise en charge est
// indisponible mais le reste du centre d'alertes fonctionne.
// Prérequis chargés avant : supabase-client.js, residents-supabase.js (etab).

function _apFromRow(r) {
  return { alerteId: r.alerte_id, prisPar: r.pris_par || '', prisParNom: r.pris_par_nom || '', prisLe: r.pris_le };
}

// Toutes les prises de l'établissement (RLS restreint déjà). Jamais bloquant.
async function sbGetAlertesPrises() {
  try {
    if (typeof supabaseClient === 'undefined') return [];
    const { data, error } = await supabaseClient.from('alertes_prises').select('*');
    if (error) { console.warn('[alertes-prises] lecture', error.message); return []; }
    return (data || []).map(_apFromRow);
  } catch (e) { console.warn('[alertes-prises]', e); return []; }
}

// Prend en charge une alerte. Renvoie l'entrée créée, ou null si indisponible.
async function sbPrendreAlerte(alerteId, nom) {
  try {
    if (typeof supabaseClient === 'undefined') return null;
    const etab = (typeof sbGetEtablissementId === 'function') ? await sbGetEtablissementId() : null;
    if (!etab) return null;
    const uid = (typeof Auth !== 'undefined' && Auth.getSession) ? String(Auth.getSession().userId || '') : '';
    const row = { alerte_id: alerteId, etablissement_id: String(etab), pris_par: uid, pris_par_nom: nom || '' };
    // upsert sur la clé (etablissement_id, alerte_id) : rejouable, idempotent.
    const { data, error } = await supabaseClient
      .from('alertes_prises').upsert(row, { onConflict: 'etablissement_id,alerte_id' }).select();
    if (error) { console.warn('[alertes-prises] prise', error.message); return null; }
    return data && data[0] ? _apFromRow(data[0]) : null;
  } catch (e) { console.warn('[alertes-prises]', e); return null; }
}

// Retire la prise en charge d'une alerte.
async function sbLacherAlerte(alerteId) {
  try {
    if (typeof supabaseClient === 'undefined') return false;
    const etab = (typeof sbGetEtablissementId === 'function') ? await sbGetEtablissementId() : null;
    if (!etab) return false;
    const { error } = await supabaseClient
      .from('alertes_prises').delete().eq('etablissement_id', String(etab)).eq('alerte_id', alerteId);
    if (error) { console.warn('[alertes-prises] lâcher', error.message); return false; }
    return true;
  } catch (e) { console.warn('[alertes-prises]', e); return false; }
}
