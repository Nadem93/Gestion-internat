// ── COUCHE SUPABASE — PROTOCOLES D'URGENCE (conduite à tenir) ──
// sbGetEtablissementId() défini dans js/residents-supabase.js (charger avant).

const PU_TYPES = {
  epilepsie:    { l: 'Épilepsie / crise convulsive', c: '#8b5cf6', ic: '⚡' },
  fausse_route: { l: 'Fausse route / étouffement',   c: '#ef4444', ic: '🫁' },
  allergie:     { l: 'Allergie / choc anaphylactique', c: '#f59e0b', ic: '🐝' },
  comportement: { l: 'Crise comportementale',        c: '#0891b2', ic: '🌀' },
  hypoglycemie: { l: 'Hypoglycémie / diabète',       c: '#d97706', ic: '🍬' },
  cardiaque:    { l: 'Malaise cardiaque',            c: '#e11d48', ic: '❤️' },
  autre:        { l: 'Autre situation',              c: '#64748b', ic: '🚨' }
};
const puLabel = t => (PU_TYPES[t] || PU_TYPES.autre).l;
const puColor = t => (PU_TYPES[t] || PU_TYPES.autre).c;
const puIcon  = t => (PU_TYPES[t] || PU_TYPES.autre).ic;

const PU_GRAVITE = {
  critique:  { l: 'Critique',  c: '#ef4444' },
  important: { l: 'Important', c: '#f59e0b' },
  info:      { l: 'Info',      c: '#0891b2' }
};

function _puToRow(p, etablissementId) {
  return {
    etablissement_id: etablissementId,
    resident_id:      p.residentId || null,
    type:             p.type || 'autre',
    titre:            p.titre || '',
    signes:           p.signes || '',
    conduite:         p.conduite || '',
    traitement:       p.traitement || '',
    contacts:         p.contacts || '',
    gravite:          p.gravite || 'important',
    actif:            p.actif !== false,
    notes:            p.notes || '',
    updated_at:       new Date().toISOString()
  };
}

function _puFromRow(r) {
  return {
    id:         r.id,
    residentId: r.resident_id || '',
    type:       r.type || 'autre',
    titre:      r.titre || '',
    signes:     r.signes || '',
    conduite:   r.conduite || '',
    traitement: r.traitement || '',
    contacts:   r.contacts || '',
    gravite:    r.gravite || 'important',
    actif:      r.actif !== false,
    notes:      r.notes || '',
    createdAt:  r.created_at
  };
}

async function sbGetProtocolesUrgence() {
  const { data, error } = await supabaseClient
    .from('protocoles_urgence')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); toast("Erreur chargement protocoles d'urgence", 'error'); return []; }
  return data.map(_puFromRow);
}

async function sbSaveProtocoleUrgence(p) {
  const etablissementId = await sbGetEtablissementId();
  const row = _puToRow(p, etablissementId);
  if (p.id) {
    const { data, error } = await supabaseClient
      .from('protocoles_urgence').update(row).eq('id', p.id).select();
    if (error) throw error;
    if (!data || !data.length) throw new Error('Aucun protocole mis à jour — id=' + p.id);
    return _puFromRow(data[0]);
  }
  const { data, error } = await supabaseClient
    .from('protocoles_urgence').insert(row).select();
  if (error) throw error;
  return _puFromRow(data[0]);
}

async function sbDeleteProtocoleUrgence(id) {
  const { data, error } = await supabaseClient
    .from('protocoles_urgence').delete().eq('id', id).select();
  if (error) throw error;
  if (!data || !data.length) throw new Error('Aucun protocole supprimé — id=' + id);
}

// ── Cache mémoire ──
let _puCache = [];
async function loadProtocolesUrgenceCache() { _puCache = await sbGetProtocolesUrgence(); return _puCache; }
function protocolesUrgenceAll() { return _puCache; }
function protocolesByResident(rid) { return _puCache.filter(p => String(p.residentId) === String(rid)); }
function protocolesActifsByResident(rid) { return protocolesByResident(rid).filter(p => p.actif); }
