// ── COUCHE SUPABASE — OBSERVATIONS & ÉCHELLES CLINIQUES ──
// Pont entre le format camelCase utilisé par observations-v2.js et les colonnes
// snake_case de la table public.observations_cliniques.
// Contient AUSSI le catalogue des grilles (OBS_GRILLES) et le calcul des scores,
// partagés par la page et (plus tard) la fiche résident.

// ════════════════════════════════════════════════════════════════════════
// CATALOGUE DES GRILLES
// Toutes les grilles sont orientées « sévérité » : plus le score est haut, plus
// la situation est préoccupante. Une courbe qui monte = dégradation.
// ════════════════════════════════════════════════════════════════════════
const OBS_GRILLES = [
  {
    id: 'douleur',
    nom: 'Douleur',
    sub: 'Hétéro-évaluation comportementale',
    aide: 'Cotée sur l\'observation directe (inspirée d\'Algoplus). Un seul item « Oui » suffit à suspecter une douleur.',
    c: '#ef4444',
    echelle: 'binaire',                 // Oui = 1 / Non = 0
    items: [
      { k: 'visage',       l: 'Visage',        d: 'Froncement, grimace, crispation, mâchoires serrées, visage figé' },
      { k: 'regard',       l: 'Regard',        d: 'Regard inattentif, fixe, lointain ou suppliant, pleurs, yeux fermés' },
      { k: 'plaintes',     l: 'Plaintes',      d: '« Aïe », « Ouille », gémissements, cris, grognements' },
      { k: 'corps',        l: 'Corps',         d: 'Protection d\'une zone, refus de mobilisation, attitude figée' },
      { k: 'comportement', l: 'Comportements', d: 'Agitation, agressivité, agrippement inhabituels' }
    ],
    seuils: [
      { min: 0, max: 1, niveau: 'Pas de douleur',      tone: 'green' },
      { min: 2, max: 5, niveau: 'Douleur probable',    tone: 'red'   }
    ]
  },
  {
    id: 'comportement',
    nom: 'Comportement',
    sub: 'Troubles du comportement observés',
    aide: 'Cotez chaque item de 0 (absent) à 3 (sévère / permanent) sur la période observée.',
    c: '#f59e0b',
    echelle: '0-3',
    items: [
      { k: 'agitation',    l: 'Agitation, instabilité motrice' },
      { k: 'agressivite',  l: 'Agressivité (verbale ou physique)' },
      { k: 'opposition',   l: 'Opposition, refus de soins' },
      { k: 'repli',        l: 'Repli, isolement' },
      { k: 'angoisse',     l: 'Angoisse, anxiété' },
      { k: 'stereotypies', l: 'Stéréotypies, auto-stimulations' }
    ],
    seuils: [
      { min: 0, max: 3,  niveau: 'Comportement calme',  tone: 'green' },
      { min: 4, max: 8,  niveau: 'Vigilance',           tone: 'amber' },
      { min: 9, max: 18, niveau: 'Troubles marqués',    tone: 'red'   }
    ]
  },
  {
    id: 'sommeil',
    nom: 'Sommeil',
    sub: 'Qualité du sommeil nocturne',
    aide: 'Cotez chaque item de 0 (jamais) à 3 (toutes les nuits) sur la période observée.',
    c: '#6366f1',
    echelle: '0-3',
    items: [
      { k: 'endormissement', l: 'Difficulté d\'endormissement' },
      { k: 'reveils',        l: 'Réveils nocturnes' },
      { k: 'deambulation',   l: 'Déambulation nocturne' },
      { k: 'agitation',      l: 'Agitation ou angoisse nocturne' }
    ],
    seuils: [
      { min: 0, max: 2,  niveau: 'Bon sommeil',            tone: 'green' },
      { min: 3, max: 6,  niveau: 'Sommeil perturbé',       tone: 'amber' },
      { min: 7, max: 12, niveau: 'Sommeil très perturbé',  tone: 'red'   }
    ]
  },
  {
    id: 'humeur',
    nom: 'Humeur',
    sub: 'Thymie et participation',
    aide: 'Cotez chaque item de 0 (absent) à 3 (marqué / constant) sur la période observée.',
    c: '#10b981',
    echelle: '0-3',
    items: [
      { k: 'tristesse',     l: 'Tristesse, pleurs' },
      { k: 'interet',       l: 'Perte d\'intérêt ou de plaisir' },
      { k: 'irritabilite',  l: 'Irritabilité' },
      { k: 'participation', l: 'Refus de participation aux activités' }
    ],
    seuils: [
      { min: 0, max: 2,  niveau: 'Humeur stable',       tone: 'green' },
      { min: 3, max: 6,  niveau: 'Humeur fragile',      tone: 'amber' },
      { min: 7, max: 12, niveau: 'Souffrance psychique', tone: 'red'   }
    ]
  }
];

// Grille par id.
function obsGrille(id) { return OBS_GRILLES.find(g => g.id === id) || null; }

// Valeur maximale possible d'un item selon l'échelle.
function obsItemMax(grille) { return grille && grille.echelle === 'binaire' ? 1 : 3; }

// Score maximal théorique de la grille.
function obsMaxScore(grille) {
  if (!grille) return 0;
  return grille.items.length * obsItemMax(grille);
}

// Total à partir d'un objet {item_k: valeur}.
function obsTotal(grille, scores) {
  if (!grille || !scores) return 0;
  return grille.items.reduce((s, it) => s + (Number(scores[it.k]) || 0), 0);
}

// Interprétation (niveau + tonalité) d'un total.
function obsInterpret(grille, total) {
  if (!grille) return { niveau: '', tone: 'gray' };
  const s = grille.seuils.find(x => total >= x.min && total <= x.max);
  return s ? { niveau: s.niveau, tone: s.tone } : { niveau: '', tone: 'gray' };
}

// ════════════════════════════════════════════════════════════════════════
// COUCHE DE DONNÉES
// ════════════════════════════════════════════════════════════════════════
function _obsFromRow(r) {
  return {
    id:            r.id,
    residentId:    r.resident_id   || '',
    grille:        r.grille        || '',
    date:          r.date          || '',
    heure:         r.heure         || '',
    scores:        r.scores        || {},
    total:         Number(r.total) || 0,
    niveau:        r.niveau        || '',
    observateur:   r.observateur   || '',
    observateurId: r.observateur_id|| '',
    notes:         r.notes         || '',
    createdAt:     r.created_at     || ''
  };
}

function _obsToRow(o, etablissementId) {
  const grille = obsGrille(o.grille);
  const total  = obsTotal(grille, o.scores);
  return {
    etablissement_id: etablissementId,
    resident_id:      o.residentId || '',
    grille:           o.grille || '',
    date:             o.date || null,
    heure:            o.heure || '',
    scores:           o.scores || {},
    total:            total,
    niveau:           obsInterpret(grille, total).niveau,
    observateur:      o.observateur || '',
    observateur_id:   o.observateurId || '',
    notes:            o.notes || '',
    updated_at:       new Date().toISOString()
  };
}

// Toutes les observations de l'établissement (pagination sûre via sbFetchAll).
async function sbGetObservations() {
  const rows = await sbFetchAll(() => supabaseClient
    .from('observations_cliniques').select('*').order('date', { ascending: false }));
  return (rows || []).map(_obsFromRow);
}

// Observations d'un résident (triées récentes → anciennes).
async function sbGetObservationsResident(residentId) {
  const { data, error } = await supabaseClient
    .from('observations_cliniques')
    .select('*')
    .eq('resident_id', residentId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(_obsFromRow);
}

async function sbSaveObservation(o) {
  const etablissementId = await sbGetEtablissementId();
  const row = _obsToRow(o, etablissementId);
  if (o.id) {
    const { data, error } = await supabaseClient
      .from('observations_cliniques').update(row).eq('id', o.id).select().single();
    if (error) throw error;
    return _obsFromRow(data);
  }
  const { data, error } = await supabaseClient
    .from('observations_cliniques').insert(row).select().single();
  if (error) throw error;
  return _obsFromRow(data);
}

async function sbDeleteObservation(id) {
  const { error } = await supabaseClient.from('observations_cliniques').delete().eq('id', id);
  if (error) throw error;
}
