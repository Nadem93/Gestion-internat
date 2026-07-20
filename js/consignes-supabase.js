// ── COUCHE SUPABASE — CONSIGNES PERMANENTES ──
// Nouveauté apportée par la maquette « Transmissions - refonte (bento) » :
// des consignes affichées en permanence au-dessus des transmissions du jour.
// Dégradation douce : si la table n'existe pas encore (migration non exécutée),
// on renvoie une liste vide plutôt que de casser la page.

function _consFromRow(r) {
  return {
    id: r.id, texte: r.texte || '', categorie: r.categorie || 'autre',
    auteur: r.auteur || '', createdBy: r.created_by || '', createdAt: r.created_at
  };
}

async function sbGetConsignes() {
  try {
    const { data, error } = await supabaseClient
      .from('consignes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(_consFromRow);
  } catch (e) {
    console.warn('[consignes] lecture impossible (migration-consignes.sql exécutée ?)', e);
    return [];
  }
}

// created_by stocke l'UID d'authentification, pas session.userId (identifiant
// hérité, différent) : c'est lui que la politique RLS compare à auth.uid().
async function _consAuthUid() {
  try {
    const { data } = await supabaseClient.auth.getUser();
    return (data && data.user && data.user.id) || null;
  } catch (e) { console.error('[consignes] uid', e); return null; }
}

async function sbSaveConsigne(c) {
  const [etablissementId, uid] = await Promise.all([sbGetEtablissementId(), _consAuthUid()]);
  const row = {
    etablissement_id: etablissementId,
    texte: c.texte || '', categorie: c.categorie || 'autre',
    auteur: c.auteur || '', created_by: uid
  };
  const { data, error } = await supabaseClient.from('consignes').insert(row).select();
  if (error) throw error;
  return _consFromRow(data[0]);
}

async function sbDeleteConsigne(id) {
  const { error } = await supabaseClient.from('consignes').delete().eq('id', id);
  if (error) throw error;
}
