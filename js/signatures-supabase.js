// ── COUCHE SUPABASE — SIGNATURES ÉLECTRONIQUES (documents clés) ──
// sbGetEtablissementId() défini dans js/residents-supabase.js (charger avant).
// Registre en ajout seul : pas de mise à jour, seulement insert / delete.

const SIG_DOCS = {
  contrat_sejour:      'Contrat de séjour',
  dipc:                'DIPC — Document Individuel de Prise en Charge',
  reglement:           'Règlement de fonctionnement',
  consent_soins:       'Consentement aux soins',
  droit_image:         "Droit à l'image",
  consent_donnees:     'Consentement données personnelles (RGPD)',
  autorisation_sortie: 'Autorisation de sortie',
  avenant_ppe:         'Avenant au projet personnalisé',
  autre:               'Autre document'
};
const SIG_ROLES = {
  resident:      'Le résident',
  representant:  'Représentant légal',
  mandataire:    'Mandataire judiciaire',
  famille:       'Membre de la famille',
  professionnel: 'Professionnel'
};
const sigDocLabel  = t => SIG_DOCS[t]  || SIG_DOCS.autre;
const sigRoleLabel = r => SIG_ROLES[r] || r;

function _sigFromRow(r) {
  return {
    id:              r.id,
    residentId:      r.resident_id || '',
    documentType:    r.document_type || 'autre',
    documentLabel:   r.document_label || '',
    signataireNom:   r.signataire_nom || '',
    signataireRole:  r.signataire_role || 'resident',
    image:           r.image || '',
    empreinte:       r.empreinte || '',
    signeLe:         r.signe_le || r.created_at,
    auteur:          r.auteur || '',
    createdAt:       r.created_at
  };
}

async function sbGetSignatures() {
  const { data, error } = await supabaseClient
    .from('signatures')
    .select('*')
    .order('signe_le', { ascending: false });
  if (error) { console.error(error); toast('Erreur chargement signatures', 'error'); return []; }
  return data.map(_sigFromRow);
}

// Insertion uniquement (registre en ajout seul).
async function sbSaveSignature(s) {
  const etablissementId = await sbGetEtablissementId();
  let auteur = s.auteur || '';
  if (!auteur) { try { const ses = Auth.getSession(); auteur = `${ses.prenom || ''} ${ses.nom || ''}`.trim() || ses.username || ''; } catch (e) {} }
  const row = {
    etablissement_id: etablissementId,
    resident_id:      s.residentId || null,
    document_type:    s.documentType || 'autre',
    document_label:   s.documentLabel || sigDocLabel(s.documentType),
    signataire_nom:   s.signataireNom || '',
    signataire_role:  s.signataireRole || 'resident',
    image:            s.image || '',
    empreinte:        s.empreinte || '',
    signe_le:         s.signeLe || new Date().toISOString(),
    auteur:           auteur
  };
  const { data, error } = await supabaseClient.from('signatures').insert(row).select();
  if (error) throw error;
  return _sigFromRow(data[0]);
}

async function sbDeleteSignature(id) {
  const { data, error } = await supabaseClient
    .from('signatures').delete().eq('id', id).select();
  if (error) throw error;
  if (!data || !data.length) throw new Error('Aucune signature supprimée — id=' + id);
}

// ── Cache mémoire ──
let _sigCache = [];
async function loadSignaturesCache() { _sigCache = await sbGetSignatures(); return _sigCache; }
function signaturesAll() { return _sigCache; }
function signaturesByResident(rid) { return _sigCache.filter(s => String(s.residentId) === String(rid)); }
