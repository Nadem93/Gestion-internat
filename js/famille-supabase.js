// ── COUCHE SUPABASE — PORTAIL FAMILLE (lecture seule) ──
// Périmètre (décision utilisateur 2026-07-01) : uniquement les documents
// résident explicitement partagés — voir migration-portail-famille.sql.

async function sbGetMesDocumentsFamille() {
  const { data, error } = await supabaseClient.rpc('get_mes_documents_famille');
  if (error) { console.error('[sbGetMesDocumentsFamille]', error); toast('Erreur chargement des documents', 'error'); return []; }
  return (data || []).map(r => ({
    residentId: r.resident_id,
    residentNom: r.resident_nom,
    documentId: r.document_id,
    documentName: r.document_name,
    fichierPath: r.fichier_path,
    category: r.category,
    docDate: r.doc_date
  }));
}

async function sbGetDocumentUrlFamille(documentId) {
  const { data, error } = await supabaseClient.functions.invoke('get-shared-document-url', {
    body: { documentId }
  });
  if (error) { console.error('[sbGetDocumentUrlFamille]', error); toast('Erreur : ' + (error.message || error), 'error'); return null; }
  if (!data?.ok) { toast(data?.error || 'Accès refusé', 'error'); return null; }
  return data.url;
}

// ── Gestion des liaisons famille↔résident et création de compte (côté personnel) ──
async function sbGetFamilleLiensResident(residentId) {
  const { data, error } = await supabaseClient
    .from('famille_residents')
    .select('id, profile_id, profiles:profile_id(prenom, nom, id)')
    .eq('resident_id', residentId);
  if (error) { console.error('[sbGetFamilleLiensResident]', error); return []; }
  return (data || []).map(r => ({ lienId: r.id, profileId: r.profile_id, prenom: r.profiles?.prenom || '', nom: r.profiles?.nom || '' }));
}

async function sbLierFamilleResident(profileId, residentId) {
  const etablissementId = await sbGetEtablissementId();
  const { error } = await supabaseClient.from('famille_residents')
    .insert({ profile_id: profileId, resident_id: residentId, etablissement_id: etablissementId });
  if (error) throw error;
}

async function sbDelierFamilleResident(lienId) {
  const { error } = await supabaseClient.from('famille_residents').delete().eq('id', lienId);
  if (error) throw error;
}
