// ══════════════════════════════════════════════════════════════════════════
// serafin-codage.js — Codification SERAFIN-PH assistée des objectifs du projet
// personnalisé (PPE/avenants).
//
// Principe : chaque objectif rédigé en texte libre reçoit des SUGGESTIONS de
// codes SERAFIN-PH (besoins 1.x + prestations 2.x) déduites de son texte et de
// son domaine, que le professionnel VALIDE d'un clic. Aucune codification
// n'est enregistrée sans validation humaine.
//
// ⚠️ Trame d'appui : les correspondances mots-clés → codes sont indicatives,
// à ajuster au guide officiel des nomenclatures SERAFIN-PH (CNSA, v3).
// Les prestations (2.x/3.x) proviennent de SP_NOMENCLATURE (js/app.js).
// ══════════════════════════════════════════════════════════════════════════

// ── Nomenclature des BESOINS (1.x) — SERAFIN-PH ──
const SP_BESOINS = [
  { code:'1.1.1', label:'Besoins en santé somatique',                          icon:'🩺' },
  { code:'1.1.2', label:'Besoins en santé psychique',                          icon:'🧠' },
  { code:'1.2.1', label:"Besoins en lien avec l'entretien personnel",          icon:'🧼' },
  { code:'1.2.2', label:'Besoins en lien avec les relations et interactions avec autrui', icon:'💬' },
  { code:'1.2.3', label:'Besoins pour la mobilité',                            icon:'🚶' },
  { code:'1.2.4', label:'Besoins pour prendre des décisions adaptées et pour la sécurité', icon:'🛟' },
  { code:'1.3.1', label:"Besoins pour accéder aux droits et à la citoyenneté", icon:'⚖️' },
  { code:'1.3.2', label:'Besoins pour vivre dans un logement et accomplir les activités domestiques', icon:'🏠' },
  { code:'1.3.3', label:'Besoins pour exercer ses rôles sociaux (emploi, formation…)', icon:'💼' },
  { code:'1.3.4', label:'Besoins pour participer à la vie sociale et se déplacer', icon:'🤝' },
  { code:'1.3.5', label:"Besoins en matière de ressources et d'autogestion",   icon:'💰' }
];

// ── Correspondance domaine PPE → besoins probables (prior) ──
const SP_DOM_BESOINS = {
  autonomie:   ['1.2.1', '1.2.4'],
  sante:       ['1.1.1', '1.1.2'],
  viePro:      ['1.3.3'],
  logement:    ['1.3.2'],
  vieSociale:  ['1.3.4', '1.2.2'],
  vieAffective:['1.2.2'],
  budget:      ['1.3.5'],
  transport:   ['1.2.3', '1.3.4'],
  orientation: ['1.3.1']
};

// ── Règles mots-clés → codes (besoins b: / prestations p:) ──
// Chaque règle : regex insensible à la casse/accents (texte normalisé) + codes.
const SP_REGLES = [
  { rx: /toilette|hygiene|douche|se laver|habillage|s habiller|se vetir|repas seul|manger seul|entretien personnel/, b:['1.2.1'], p:['2.2.1'] },
  { rx: /sante|medical|medecin|traitement|medicament|soin|infirmier|douleur|consultation|rendez vous medic|vaccin|dentiste/, b:['1.1.1'], p:['2.1.1'] },
  { rx: /psycholog|psychiatr|anxiete|angoisse|emotion|comportement|humeur|estime de soi|bien etre psychique/, b:['1.1.2'], p:['2.1.1'] },
  { rx: /reeducation|kine|ergotherap|orthophon|psychomot|readaptation/, b:['1.1.1'], p:['2.1.2'] },
  { rx: /marche|deplacement|se deplacer|mobilite|transport|bus|metro|conduite|permis|velo/, b:['1.2.3'], p:['3.2.4', '2.3.4'] },
  { rx: /securite|danger|risque|se proteger|decision|choix|consentement|discernement/, b:['1.2.4'], p:['2.2.1'] },
  { rx: /communication|communiquer|relation|interaction|echange|conversation|parole|s exprimer|falc|pictogramme/, b:['1.2.2'], p:['2.3.4'] },
  { rx: /droit|citoyen|vote|papier|carte d identite|dossier mdph|administratif|demarche|curatelle|tutelle|protection juridique/, b:['1.3.1'], p:['2.3.1'] },
  { rx: /logement|studio|appartement|chambre|menage|linge|lessive|cuisine|courses|domestique|habitat/, b:['1.3.2'], p:['2.3.2'] },
  { rx: /travail|emploi|professionnel|atelier|esat|stage|formation|scolar|apprentissage|competence/, b:['1.3.3'], p:['2.3.3'] },
  { rx: /social|loisir|activite|sport|culture|sortie|club|association|vacances|sejour|groupe|collectif|amis|pair/, b:['1.3.4'], p:['2.3.4'] },
  { rx: /budget|argent|compte|depense|economie|gerer ses ressources|achat|autogestion/, b:['1.3.5'], p:['2.3.5'] },
  { rx: /famille|parent|fratrie|proche|visite famil/, b:['1.2.2'], p:['2.3.4'] },
  { rx: /coordination|parcours|orientation|partenaire|reseau|projet de vie|synthese/, b:['1.3.1'], p:['2.4.1'] }
];

function _spNorm(s) {
  // Les diacritiques NFD sont SUPPRIMÉS (pas remplacés par une espace, sinon
  // « hygiène » deviendrait « hygie ne » et les règles ne matcheraient plus).
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
}

// Libellé d'un code (besoin ou prestation)
function spLabel(code) {
  const b = SP_BESOINS.find(x => x.code === code);
  if (b) return b.label;
  const p = (typeof SP_NOMENCLATURE !== 'undefined') ? SP_NOMENCLATURE.find(x => x.code === code) : null;
  return p ? p.label : code;
}
function spIcon(code) {
  const b = SP_BESOINS.find(x => x.code === code);
  if (b) return b.icon;
  const p = (typeof SP_NOMENCLATURE !== 'undefined') ? SP_NOMENCLATURE.find(x => x.code === code) : null;
  return p ? p.icon : '·';
}
function spEstBesoin(code) { return String(code).charAt(0) === '1'; }

// Liste blanche : seul un code présent dans les nomenclatures est rendu/compté.
// Rempart contre un code forgé dans le jsonb (injection dans innerHTML/onclick).
function spCodeValide(code) {
  return SP_BESOINS.some(b => b.code === code) ||
    (typeof SP_NOMENCLATURE !== 'undefined' && SP_NOMENCLATURE.some(p => p.code === code));
}

// ── Moteur de suggestion ──
// Retourne { besoins:[codes], prestations:[codes] } classés par pertinence.
// Score : +2 par règle mot-clé qui matche, +1 si le code est un prior du domaine.
function spSuggerer(texte, domaineId) {
  const t = _spNorm(texte);
  const score = {};
  const add = (code, pts) => { score[code] = (score[code] || 0) + pts; };

  if (t.trim()) {
    SP_REGLES.forEach(r => {
      if (r.rx.test(t)) {
        (r.b || []).forEach(c => add(c, 2));
        (r.p || []).forEach(c => add(c, 2));
      }
    });
  }
  (SP_DOM_BESOINS[domaineId] || []).forEach(c => add(c, 1));
  if (typeof DOMAINE_SERAFIN_MAP !== 'undefined') {
    (DOMAINE_SERAFIN_MAP[domaineId] || []).forEach(c => add(c, 1));
  }

  const tri = Object.entries(score).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  return {
    besoins:     tri.filter(spEstBesoin).slice(0, 3),
    prestations: tri.filter(c => !spEstBesoin(c)).slice(0, 3)
  };
}

// ── Rendu d'une pastille de code ──
// on = validée (pleine) ; off = suggestion (pointillés). onclickAttr facultatif.
function spChip(code, on, onclickAttr) {
  const besoin = spEstBesoin(code);
  const base = besoin
    ? (on ? 'background:#7c3aed;border:1.5px solid #7c3aed;color:#fff' : 'background:#fff;border:1.5px dashed #c4b5fd;color:#7c3aed')
    : (on ? 'background:#0d9488;border:1.5px solid #0d9488;color:#fff' : 'background:#fff;border:1.5px dashed #99e5dc;color:#0d9488');
  return `<button type="button" ${onclickAttr || ''} title="${escHtml(spLabel(code))}${on ? ' — cliquer pour retirer' : ' — cliquer pour valider'}"
    style="cursor:pointer;font-family:inherit;font-size:.62rem;font-weight:700;line-height:1;display:inline-flex;align-items:center;gap:.28rem;padding:.28rem .5rem;border-radius:999px;white-space:nowrap;${base}">
    ${on ? '✓' : '+'} ${code}</button>`;
}

// Comptage des codes validés sur l'ensemble des objectifs d'un avenant.
// Ignore les lignes au texte vide (codes orphelins) et les codes hors nomenclature.
function spComptesAvenant(p) {
  const compte = {};
  Object.values(p.sections || {}).forEach(s => (s.objectifs || []).forEach(o => {
    if (!(o.objectif || '').trim()) return;
    (o.serafin || []).filter(spCodeValide).forEach(c => { compte[c] = (compte[c] || 0) + 1; });
  }));
  return compte;
}
