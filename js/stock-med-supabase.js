// ── COUCHE SUPABASE — STOCK DE MÉDICAMENTS ──
// Alimente le panneau « Stock & renouvellements » de la page Distribution des
// médicaments (maquette « Médicaments (vie quotidienne) »).
// Dégradation douce : tant que migration-stock-medicaments.sql n'a pas été
// exécutée, la lecture renvoie une liste vide plutôt que de casser la page,
// et l'écriture remonte une erreur nommant le fichier SQL à exécuter.

const STOCK_MED_SQL = 'migration-stock-medicaments.sql';

function _stkFromRow(r) {
  return {
    id: r.id,
    residentId: r.resident_id || '',
    traitementId: r.traitement_id || '',
    libelle: r.libelle || '',
    quantite: r.quantite ?? 0,
    quantiteInitiale: r.quantite_initiale ?? 0,
    seuilAlerte: r.seuil_alerte ?? null,
    unite: r.unite || '',
    datePeremption: r.date_peremption || '',
    createdAt: r.created_at
  };
}

function _stkToRow(s, etablissementId) {
  const init = Number(s.quantiteInitiale);
  const qte = Number(s.quantite);
  return {
    etablissement_id: etablissementId,
    resident_id: s.residentId || null,
    traitement_id: s.traitementId || null,
    libelle: s.libelle || '',
    quantite: Number.isFinite(qte) ? qte : 0,
    quantite_initiale: Number.isFinite(init) ? init : 0,
    seuil_alerte: (s.seuilAlerte === '' || s.seuilAlerte == null) ? null : Number(s.seuilAlerte),
    unite: s.unite || null,
    date_peremption: s.datePeremption || null
  };
}

// La table manque-t-elle ? PostgREST répond PGRST205 / 42P01 selon la couche.
function _stkTableManquante(e) {
  const code = (e && e.code) || '';
  const msg = ((e && e.message) || '').toLowerCase();
  return code === 'PGRST205' || code === '42P01'
    || msg.includes('does not exist') || msg.includes('schema cache');
}

async function sbGetStockMed() {
  try {
    const { data, error } = await supabaseClient
      .from('stock_medicaments').select('*').order('libelle', { ascending: true });
    if (error) throw error;
    return (data || []).map(_stkFromRow);
  } catch (e) {
    console.warn(`[stock-med] lecture impossible (${STOCK_MED_SQL} exécutée ?)`, e);
    return [];
  }
}

async function sbSaveStockMed(s) {
  try {
    const etablissementId = await sbGetEtablissementId();
    const row = _stkToRow(s, etablissementId);
    if (s.id) {
      const { data, error } = await supabaseClient
        .from('stock_medicaments').update(row).eq('id', s.id).select();
      if (error) throw error;
      if (!data || !data.length) throw new Error('Aucune ligne de stock mise à jour — id=' + s.id);
      return _stkFromRow(data[0]);
    }
    const { data, error } = await supabaseClient
      .from('stock_medicaments').insert(row).select();
    if (error) throw error;
    return _stkFromRow(data[0]);
  } catch (e) {
    if (_stkTableManquante(e)) throw new Error(`Table stock_medicaments absente — exécutez ${STOCK_MED_SQL} dans Supabase.`);
    throw e;
  }
}

async function sbDeleteStockMed(id) {
  try {
    const { data, error } = await supabaseClient
      .from('stock_medicaments').delete().eq('id', id).select();
    if (error) throw error;
    if (!data || !data.length) throw new Error('Aucune ligne de stock supprimée — id=' + id);
  } catch (e) {
    if (_stkTableManquante(e)) throw new Error(`Table stock_medicaments absente — exécutez ${STOCK_MED_SQL} dans Supabase.`);
    throw e;
  }
}
