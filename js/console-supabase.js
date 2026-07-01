// ── COUCHE SUPABASE — CONSOLE GROUPE (vue consolidée superadmin uniquement) ──
// Périmètre volontairement réduit : seule la vue consolidée est migrée
// (voir migration-console-vue-consolidee.sql). Les autres onglets legacy
// de console.html restent basés sur getEtabs()/getEtabData() (localStorage).

async function sbGetEtablissementsMeta() {
  const { data, error } = await supabaseClient
    .from('etablissements').select('*').order('nom');
  if (error) { console.error('[sbGetEtablissementsMeta]', error); toast('Erreur chargement établissements', 'error'); return []; }
  return data || [];
}

async function sbSaveEtablissementMeta(etab) {
  const row = { id: etab.id, nom: etab.nom || '', ville: etab.ville || '', type: etab.type || '', couleur: etab.couleur || '#0f2b4a' };
  const { error } = await supabaseClient.from('etablissements').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

async function sbDeleteEtablissementMeta(id) {
  const { error } = await supabaseClient.from('etablissements').delete().eq('id', id);
  if (error) throw error;
}

async function sbGetConsolidatedStats() {
  const { data, error } = await supabaseClient.rpc('get_consolidated_stats');
  if (error) { console.error('[sbGetConsolidatedStats]', error); toast('Erreur chargement de la vue consolidée', 'error'); return []; }
  return (data || []).map(r => ({
    id: r.etablissement_id,
    nom: r.nom,
    couleur: r.couleur,
    residentsActifs: r.residents_actifs || 0,
    capacite: r.capacite || 0,
    incidentsOuverts: r.incidents_ouverts || 0,
    avenantsActifs: r.avenants_actifs || 0,
    journalJour: r.journal_jour || 0
  }));
}
