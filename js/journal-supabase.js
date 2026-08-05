// ── COUCHE DE CONNEXION SUPABASE — JOURNAL DE BORD ──
// sbGetEtablissementId() et sbGetResidents() sont définis dans js/residents-supabase.js
// (chargé avant ce fichier).

function _jToRow(e, etablissementId) {
  return {
    etablissement_id: etablissementId,
    resident_id: e.residentId || null,
    resident: e.resident || '',
    resident_color: e.residentColor || '',
    categorie: e.categorie || '',
    date: e.date || '',
    objectif: e.objectif || '',
    contenu: e.contenu || '',
    accompagnement: e.accompagnement || '',
    niveau_soutien: e.niveauSoutien || null,
    visibilite: e.visibilite || 'equipe',
    serafinph_type: e.serafinphType || '',
    attachments: e.attachments || [],
    author: e.author || '',
    author_id: e.authorId || null,
    replies: e.replies || [],
    read_by: e.readBy || [],
    edited_by: e.editedBy || null,
    edited_by_id: e.editedById || null,
    edited_at: e.editedAt || null,
    edit_history: e.editHistory || [],
    created_at: e.createdAt || new Date().toISOString(),
    updated_at: e.updatedAt || new Date().toISOString()
  };
}

function _jFromRow(r) {
  return {
    id: r.id,
    type: 'observation',
    residentId: r.resident_id,
    resident: r.resident,
    residentColor: r.resident_color,
    categorie: r.categorie,
    date: r.date,
    objectif: r.objectif,
    contenu: r.contenu,
    accompagnement: r.accompagnement || '',
    niveauSoutien: r.niveau_soutien || '',
    visibilite: r.visibilite,
    serafinphType: r.serafinph_type,
    attachments: r.attachments || [],
    author: r.author,
    authorId: r.author_id,
    replies: r.replies || [],
    readBy: r.read_by || [],
    editedBy: r.edited_by,
    editedById: r.edited_by_id,
    editedAt: r.edited_at,
    editHistory: r.edit_history || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

async function sbGetJournalEntries() {
  // sbFetchAll : sans lui, l'historique du journal serait tronqué à 1000 entrées.
  try {
    const data = await sbFetchAll(() => supabaseClient
      .from('journal_entries').select('*').order('date', { ascending: false }));
    return data.map(_jFromRow);
  } catch (error) { console.error(error); toast('Erreur de chargement du journal', 'error'); return []; }
}

// Lecture LÉGÈRE pour le comptage des non-lues (cloche de notifications).
// sbGetJournalEntries() fait un select('*') : il rapatrie le contenu ET les
// pièces jointes stockées en base (jusqu'à plusieurs Mo par entrée), alors que
// le compteur n'a besoin que de read_by. Appelé toutes les minutes sur une
// dizaine de pages, l'écart est considérable.
async function sbGetJournalReadBy() {
  try {
    return await sbFetchAll(() => supabaseClient
      .from('journal_entries').select('id,read_by').order('id'));
  } catch (error) { console.error('[journal] comptage', error); return []; }
}

// Mise à jour CIBLÉE d'une ou deux colonnes, sans réécrire la ligne entière.
// Indispensable pour « marquer comme lu » et pour ajouter une réponse : ces
// gestes partent du cache du navigateur, qui peut dater de plusieurs heures.
// Passer par sbSaveJournalEntry() renverrait TOUT l'objet en base et écraserait
// silencieusement le contenu corrigé entre-temps par un collègue sur un autre
// poste. Même principe que sbUpdateTransmissionField (js/transmissions-supabase.js).
async function sbUpdateJournalField(id, fields) {
  const { data, error } = await supabaseClient
    .from('journal_entries').update(fields).eq('id', id).select().single();
  if (error) throw error;
  return _jFromRow(data);
}

async function sbSaveJournalEntry(entry) {
  const etablissementId = await sbGetEtablissementId();
  const row = _jToRow(entry, etablissementId);
  if (entry.id) {
    const { data, error } = await supabaseClient
      .from('journal_entries').update(row).eq('id', entry.id).select().single();
    if (error) throw error;
    return _jFromRow(data);
  }
  const { data, error } = await supabaseClient
    .from('journal_entries').insert(row).select().single();
  if (error) throw error;
  return _jFromRow(data);
}

async function sbDeleteJournalEntry(id) {
  const { error } = await supabaseClient.from('journal_entries').delete().eq('id', id);
  if (error) throw error;
}
