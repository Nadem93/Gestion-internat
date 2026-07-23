// ── COUCHE SUPABASE — Dashboard V2 : annonces internes & climat par unité ──
// Tables créées par migration-dashboard-v2.sql.
// sbGetEtablissementId() est défini dans js/residents-supabase.js.

// ─── Annonces internes ────────────────────────────────────────────────────
function _annFromRow(r) {
  return {
    id: r.id,
    titre: r.titre || '',
    texte: r.texte || '',
    service: r.service || '',
    auteur: r.auteur || '',
    createdBy: r.created_by != null ? String(r.created_by) : null,
    date: r.date_pub || null,
    epingle: !!r.epingle,
    createdAt: r.created_at
  };
}

async function sbGetAnnonces(limit) {
  const { data, error } = await supabaseClient
    .from('annonces').select('*')
    .order('epingle', { ascending: false })
    .order('date_pub', { ascending: false })
    .limit(limit || 20);
  // Table absente (migration non exécutée) : on dégrade sans casser le dashboard.
  if (error) { console.warn('[sbGetAnnonces]', error.message); return []; }
  return data.map(_annFromRow);
}

async function sbSaveAnnonce(a) {
  const etablissementId = await sbGetEtablissementId();
  const row = {
    etablissement_id: etablissementId,
    titre: a.titre || '',
    texte: a.texte || '',
    service: a.service || '',
    auteur: a.auteur || '',
    date_pub: a.date || new Date().toISOString().slice(0, 10),
    epingle: !!a.epingle,
    updated_at: new Date().toISOString()
  };
  if (a.id) {
    const { data, error } = await supabaseClient
      .from('annonces').update(row).eq('id', a.id).select();
    if (error) throw error;
    return _annFromRow(data[0]);
  }
  row.created_by = a.createdBy != null ? String(a.createdBy) : null;
  const { data, error } = await supabaseClient.from('annonces').insert(row).select();
  if (error) throw error;
  return _annFromRow(data[0]);
}

async function sbDeleteAnnonce(id) {
  const { error } = await supabaseClient.from('annonces').delete().eq('id', id);
  if (error) throw error;
}

// ─── Climat par unité (« Météo du foyer ») ────────────────────────────────
function _climFromRow(r) {
  return {
    id: r.id,
    date: r.date,
    unite: r.unite || '',
    niveau: r.niveau || 'calme',   // calme | tendu | difficile
    note: r.note || '',
    saisiPar: r.saisi_par || ''
  };
}

// Renvoie les relevés entre deux dates (incluses).
async function sbGetClimat(startDate, endDate) {
  const { data, error } = await supabaseClient
    .from('climat_unite').select('*')
    .gte('date', startDate).lte('date', endDate)
    .order('date', { ascending: true });
  if (error) { console.warn('[sbGetClimat]', error.message); return []; }
  return data.map(_climFromRow);
}

// Un seul relevé par (établissement, date, unité) : on remonte sur le conflit.
async function sbSaveClimat(c) {
  const etablissementId = await sbGetEtablissementId();
  const row = {
    etablissement_id: etablissementId,
    date: c.date || new Date().toISOString().slice(0, 10),
    unite: c.unite || '',
    niveau: c.niveau || 'calme',
    note: c.note || '',
    saisi_par: c.saisiPar || '',
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabaseClient
    .from('climat_unite')
    .upsert(row, { onConflict: 'etablissement_id,date,unite' })
    .select();
  if (error) throw error;
  return _climFromRow(data[0]);
}
