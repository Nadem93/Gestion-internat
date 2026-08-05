// ── COUCHE SUPABASE — CLIMAT PAR UNITÉ (« Météo du foyer ») ──
// Un relevé par (établissement, date, unité) : niveau calme | tendu | difficile.
// sbGetEtablissementId() vient de js/residents-supabase.js (charger avant).
// Partagé par le tableau de bord (lecture) et la modale de transmission (saisie).

const CLIMAT_NIVEAUX = {
  calme:     { label: 'Calme',     color: '#10b981' },
  tendu:     { label: 'Tendu',     color: '#f59e0b' },
  difficile: { label: 'Difficile', color: '#ef4444' }
};

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
    date: c.date || today(),
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
