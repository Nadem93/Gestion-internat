// ── COUCHE DE CONNEXION SUPABASE — PRÉSENCES ──
// Une ligne = un résident + une date + un statut.
// sbGetEtablissementId() est défini dans js/residents-supabase.js (chargé avant ce fichier).

// select('*') plutôt qu'une liste de colonnes : la colonne motif peut ne pas
// encore exister (migration-presences-motif.sql) et une colonne absente dans
// un select nommé fait échouer toute la requête.
async function sbGetPresencesForDate(date) {
  const { data, error } = await supabaseClient
    .from('presences').select('*').eq('date', date);
  if (error) { console.error(error); toast('Erreur de chargement des présences', 'error'); return {}; }
  const out = {};
  data.forEach(row => { out[row.resident_id] = { statut: row.statut, motif: row.motif || '' }; });
  return out;
}

// Pour l'export PDF : toutes les présences entre deux dates, groupées par date.
// residentId facultatif : la fiche résident n'a besoin que d'une personne, et
// filtrer côté serveur évite de rapatrier ~40× trop de lignes (donc la pagination).
async function sbGetPresencesRange(startDate, endDate, residentId) {
  // Lecture paginée : une plage d'un mois dépasse déjà 1000 lignes (~41 résidents × 31 j)
  let data;
  try {
    data = await sbFetchAll(() => {
      let q = supabaseClient
        .from('presences').select('resident_id, date, statut')
        .gte('date', startDate).lte('date', endDate);
      if (residentId) q = q.eq('resident_id', residentId);
      return q.order('date').order('resident_id');
    });
  } catch (error) { console.error(error); toast('Erreur de chargement des présences', 'error'); return {}; }
  const out = {};
  data.forEach(row => {
    if (!out[row.date]) out[row.date] = {};
    out[row.date][row.resident_id] = row.statut;
  });
  return out;
}

// Écriture défensive : si la colonne motif n'existe pas encore (PGRST204),
// on réessaie sans elle et on prévient une seule fois.
let _sbPresMotifOk = true;

async function sbSetPresence(residentId, date, statut, motif) {
  const etablissementId = await sbGetEtablissementId();
  const row = { resident_id: residentId, date, statut, etablissement_id: etablissementId };
  const withMotif = _sbPresMotifOk && motif !== undefined;
  if (withMotif) row.motif = motif || null;
  let { error } = await supabaseClient
    .from('presences').upsert(row, { onConflict: 'resident_id,date' });
  if (error && withMotif && error.code === 'PGRST204') {
    _sbPresMotifOk = false;
    delete row.motif;
    ({ error } = await supabaseClient
      .from('presences').upsert(row, { onConflict: 'resident_id,date' }));
    if (!error && motif) toast('Statut enregistré, mais pas le motif : exécutez migration-presences-motif.sql', 'error');
  }
  if (error) throw error;
}

async function sbSetPresencesBulk(residentIds, date, statut) {
  const etablissementId = await sbGetEtablissementId();
  const rows = residentIds.map(id => ({ resident_id: id, date, statut, etablissement_id: etablissementId }));
  const { error } = await supabaseClient
    .from('presences').upsert(rows, { onConflict: 'resident_id,date' });
  if (error) throw error;
}
