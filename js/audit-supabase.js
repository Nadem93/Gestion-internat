// ── JOURNAL D'AUDIT CENTRALISÉ (Supabase) ──
// Table public.audit_log (voir migration-fonctionnalites-v2.sql).
// Rend la traçabilité RGPD durable et partagée, là où auditLog() n'écrivait
// qu'en localStorage. Écriture « au mieux » : une panne ou une table absente
// ne doit jamais bloquer l'action de l'utilisateur.
// Prérequis chargés avant : supabase-client.js, residents-supabase.js (etab).

// Écrit une entrée. `entry` = { action, details, residentId?, userId?, userName?, role? }.
// Renvoie une promesse qui ne rejette jamais (le journal est secondaire).
async function sbLogAudit(entry) {
  try {
    if (typeof supabaseClient === 'undefined') return null;
    const etab = (typeof sbGetEtablissementId === 'function') ? await sbGetEtablissementId() : null;
    if (!etab) return null;
    const row = {
      etablissement_id: String(etab),
      action:      entry.action || 'action',
      details:     entry.details || '',
      user_id:     entry.userId != null ? String(entry.userId) : null,
      user_name:   entry.userName || '',
      role:        entry.role || '',
      resident_id: entry.residentId || null
      // ts : défaut now() côté base
    };
    // Passe par le client → mutualisation + file d'attente hors-ligne. La trace
    // d'un geste fait sans réseau partira donc au retour de la connexion.
    const { error } = await supabaseClient.from('audit_log').insert(row);
    if (error) { console.warn('[audit] insert', error.message); return null; }
    return true;
  } catch (e) { console.warn('[audit]', e); return null; }
}

// Historique d'un dossier : les accès et écritures liés à un résident, du plus
// récent au plus ancien. RLS restreint déjà à l'établissement.
async function sbGetAuditForResident(residentId, max) {
  try {
    if (typeof supabaseClient === 'undefined' || !residentId) return [];
    const { data, error } = await supabaseClient
      .from('audit_log')
      .select('id,ts,user_name,role,action,details')
      .eq('resident_id', residentId)
      .order('ts', { ascending: false })
      .limit(max || 50);
    if (error) { console.warn('[audit] lecture dossier', error.message); return []; }
    return data || [];
  } catch (e) { console.warn('[audit]', e); return []; }
}
