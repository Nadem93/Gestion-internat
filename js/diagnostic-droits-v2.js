// ── DIAGNOSTIC DES DROITS & OBLIGATIONS (RH) — DESIGN V2 ──────────────────
// Reproduit la maquette « Diagnostic droits (RH) » : score global de
// conformité, tuiles de synthèse, domaines de conformité, points de vigilance,
// plan d'action, veille réglementaire, auto-diagnostic Oui/Non, évolution du
// score, exposition aux risques, échéancier légal et référents désignés.
//
// LE RÉFÉRENTIEL (6 domaines, 48 obligations légales, 4 rôles de référents,
// 4 risques suivis) est un contenu réglementaire : il vit ici, en constantes.
// L'ÉTAT de l'établissement vit en base, dans les tables créées par
// migration-diagnostic-droits.sql. Tant que ce fichier n'est pas exécuté, la
// lecture renvoie [] avec un console.warn et l'écriture est refusée par un
// toast nommant le fichier : la page reste utilisable.
//
// Aucune valeur n'est inventée : sans évaluation, le score vaut « — » et les
// domaines s'affichent « non évalué » — jamais 0 %.
//
// ⚠ Données RH sensibles (obligations de l'employeur, responsabilité pénale) :
// toute la page est réservée à l'encadrement RH (Auth.isRH()), en plus du
// filtre RLS côté base. Aucun contrôle d'accès existant n'est desserré.

const DD2_SQL = 'migration-diagnostic-droits.sql';

const DD2_T_OBL = 'conformite_obligations';
const DD2_T_ACT = 'conformite_actions';
const DD2_T_VEI = 'conformite_veille';
const DD2_T_REF = 'conformite_referents';
const DD2_T_SCO = 'conformite_scores';

// ── Icônes (traits, 24×24) ───────────────────────────────────────────────
const DD2_IC = {
  scale: '<path d="M12 3v18M3 7h18M7 7l-3 7h6zM17 7l-3 7h6z"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21l8.84-8.61a5.5 5.5 0 0 0 0-7.78z"/>',
  lock:  '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  euro:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  fire:  '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  cal:   '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>',
  clip:  '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  dl:    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  plus:  '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  x:     '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  back:  '<path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>',
  user:  '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  book:  '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>'
};
function dd2Svg(k, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:${w || 16}px;height:${w || 16}px">${DD2_IC[k] || ''}</svg>`;
}

// ── RÉFÉRENTIEL : domaines de conformité ─────────────────────────────────
const DD2_DOMAINES = [
  { id: 'travail', label: 'Droit du travail',            detail: 'Contrats, temps de travail',    c: '#22d3ee', ic: 'scale' },
  { id: 'cse',     label: 'Représentation du personnel', detail: 'CSE, élections',                c: '#818cf8', ic: 'users' },
  { id: 'sst',     label: 'Santé & sécurité (DUERP)',    detail: 'Document unique, RPS',          c: '#f59e0b', ic: 'heart' },
  { id: 'rgpd',    label: 'RGPD & données',              detail: 'Registre, dossiers salariés',   c: '#ec4899', ic: 'lock' },
  { id: 'social',  label: 'Obligations sociales',        detail: 'DSN, cotisations, mutuelle',    c: '#10b981', ic: 'euro' },
  { id: 'erp',     label: 'Sécurité incendie / ERP',     detail: 'Registre, exercices',           c: '#ef4444', ic: 'fire' }
];

// ── RÉFÉRENTIEL : obligations ────────────────────────────────────────────
// q    : question posée dans l'auto-diagnostic
// l    : intitulé court du manquement (points de vigilance, plan d'action)
// det  : précision affichée sous l'intitulé
// crit : obligation critique — un manquement compte « non conforme »
//        (sinon il compte « à régulariser »)
const DD2_OBLIGATIONS = [
  // Droit du travail
  { c: 't1', d: 'travail', crit: true,  q: 'Contrats de travail écrits et signés pour tous les salariés ?', l: 'Contrats de travail', det: 'Écrit signé pour chaque salarié' },
  { c: 't2', d: 'travail', crit: true,  q: 'Registre unique du personnel tenu à jour ?',                    l: 'Registre unique du personnel', det: 'Tenue et conservation' },
  { c: 't3', d: 'travail', crit: true,  q: 'Repos quotidien de 11 h et repos hebdomadaire respectés ?',     l: 'Repos quotidien / hebdomadaire', det: 'Durées légales de repos' },
  { c: 't4', d: 'travail', crit: false, q: 'Décompte du temps de travail établi et conservé ?',             l: 'Décompte du temps de travail', det: 'Relevés conservés 1 an' },
  { c: 't5', d: 'travail', crit: false, q: 'Horaires collectifs de travail affichés ?',                     l: 'Affichage des horaires', det: 'Horaires collectifs' },
  { c: 't6', d: 'travail', crit: false, q: "Accord ou décision unilatérale d'annualisation à jour ?",       l: "Accord d'annualisation", det: 'Modulation du temps de travail' },
  { c: 't7', d: 'travail', crit: false, q: 'Entretiens professionnels réalisés tous les 2 ans ?',           l: 'Entretiens professionnels', det: 'Périodicité biennale' },
  { c: 't8', d: 'travail', crit: false, q: 'Convention collective (CCN 66) tenue à disposition ?',          l: 'Mise à disposition de la CCN', det: 'Consultable par les salariés' },
  { c: 't9', d: 'travail', crit: true,  q: 'Règlement intérieur affiché et déposé ?',                       l: 'Règlement intérieur', det: 'Affichage et dépôt' },

  // Représentation du personnel
  { c: 'c1', d: 'cse', crit: true,  q: 'CSE constitué, ou procès-verbal de carence à jour ?',            l: 'Constitution du CSE', det: 'CSE ou PV de carence' },
  { c: 'c2', d: 'cse', crit: true,  q: 'Réunions du CSE tenues à la périodicité légale ?',               l: 'Réunions du CSE', det: 'Périodicité légale' },
  { c: 'c3', d: 'cse', crit: false, q: 'Procès-verbaux de réunion rédigés et diffusés ?',                l: 'PV de réunion', det: 'Rédaction et diffusion' },
  { c: 'c4', d: 'cse', crit: false, q: 'Base de données économiques et sociales accessible aux élus ?',  l: 'BDESE', det: 'Accès des élus' },
  { c: 'c5', d: 'cse', crit: true,  q: 'Budget de fonctionnement du CSE versé ?',                        l: 'Budget du CSE', det: 'Versement annuel' },
  { c: 'c6', d: 'cse', crit: false, q: 'Élus formés en santé, sécurité et conditions de travail ?',      l: 'Formation des élus', det: 'Formation SSCT' },
  { c: 'c7', d: 'cse', crit: false, q: 'Consultations annuelles obligatoires réalisées ?',              l: 'Consultations annuelles', det: 'Trois consultations récurrentes' },

  // Santé & sécurité (les 6 questions de la maquette)
  { c: 's1', d: 'sst', crit: true,  q: 'DUERP actualisé dans les 12 mois ?',                l: 'DUERP non actualisé', det: 'Mise à jour annuelle obligatoire' },
  { c: 's2', d: 'sst', crit: false, q: 'Affichage des consignes de sécurité ?',             l: 'Consignes de sécurité', det: 'Affichage dans les locaux' },
  { c: 's3', d: 'sst', crit: false, q: 'Registre de sécurité tenu à jour ?',                l: 'Registre de sécurité', det: 'Tenue à jour' },
  { c: 's4', d: 'sst', crit: true,  q: 'Formation SST à jour (au moins un secouriste) ?',   l: 'Formation SST', det: 'Au moins un secouriste formé' },
  { c: 's5', d: 'sst', crit: true,  q: "Exercice d'évacuation réalisé dans l'année ?",      l: "Exercice d'évacuation", det: 'Au moins un par an' },
  { c: 's6', d: 'sst', crit: false, q: 'Plan de prévention des RPS formalisé ?',            l: 'Prévention des RPS', det: 'Plan formalisé' },

  // RGPD & données
  { c: 'g1', d: 'rgpd', crit: true,  q: 'Registre des traitements RH complet ?',                        l: 'Registre RGPD incomplet', det: 'Traitements RH à documenter' },
  { c: 'g2', d: 'rgpd', crit: true,  q: 'Délégué à la protection des données désigné ?',                l: 'Désignation du DPO', det: 'Obligatoire pour un ESSMS' },
  { c: 'g3', d: 'rgpd', crit: false, q: 'Salariés informés du traitement de leurs données ?',           l: 'Information des salariés', det: 'Notice de traitement' },
  { c: 'g4', d: 'rgpd', crit: false, q: 'Durées de conservation des dossiers définies ?',               l: 'Durées de conservation', det: 'Politique documentée' },
  { c: 'g5', d: 'rgpd', crit: false, q: "Habilitations d'accès aux dossiers salariés tracées ?",        l: "Habilitations d'accès", det: 'Traçabilité des accès' },
  { c: 'g6', d: 'rgpd', crit: false, q: 'Procédure de violation de données formalisée ?',               l: 'Violation de données', det: 'Procédure de notification' },
  { c: 'g7', d: 'rgpd', crit: false, q: 'Contrats de sous-traitance conformes à l’article 28 ?',        l: 'Sous-traitance', det: 'Clauses article 28' },
  { c: 'g8', d: 'rgpd', crit: false, q: "Analyse d'impact réalisée pour les traitements sensibles ?",   l: "Analyse d'impact", det: 'AIPD sur données sensibles' },

  // Obligations sociales
  { c: 'o1', d: 'social', crit: true,  q: 'DSN transmises dans les délais ?',                          l: 'DSN', det: 'Transmission mensuelle' },
  { c: 'o2', d: 'social', crit: true,  q: 'Cotisations sociales réglées à échéance ?',                 l: 'Cotisations sociales', det: 'Paiement à échéance' },
  { c: 'o3', d: 'social', crit: true,  q: 'Mutuelle collective proposée à tous les salariés ?',        l: 'Mutuelle collective', det: 'Couverture obligatoire' },
  { c: 'o4', d: 'social', crit: false, q: 'Prévoyance conforme à la CCN 66 ?',                         l: 'Prévoyance', det: 'Garanties conventionnelles' },
  { c: 'o5', d: 'social', crit: false, q: 'Affiliation retraite complémentaire à jour ?',              l: 'Retraite complémentaire', det: 'Affiliation à jour' },
  { c: 'o6', d: 'social', crit: false, q: 'Bulletins de paie conformes au modèle réglementaire ?',     l: 'Bulletins de paie', det: 'Modèle réglementaire' },
  { c: 'o7', d: 'social', crit: false, q: 'Déclaration OETH (travailleurs handicapés) effectuée ?',    l: 'Déclaration OETH', det: 'Obligation d’emploi' },
  { c: 'o8', d: 'social', crit: false, q: "Versement mobilité et taxe d'apprentissage acquittés ?",    l: 'Contributions annexes', det: 'Versement mobilité, taxe' },
  { c: 'o9', d: 'social', crit: false, q: 'Obligation de négocier sur l’épargne salariale examinée ?', l: 'Épargne salariale', det: 'Obligation examinée' },

  // Sécurité incendie / ERP
  { c: 'e1', d: 'erp', crit: true,  q: 'Registre de sécurité ERP tenu à jour ?',                    l: 'Registre de sécurité ERP', det: 'Tenue à jour' },
  { c: 'e2', d: 'erp', crit: true,  q: 'Commission de sécurité passée avec avis favorable ?',       l: 'Commission de sécurité', det: 'Avis favorable en cours' },
  { c: 'e3', d: 'erp', crit: false, q: 'Vérifications périodiques des installations électriques ?', l: 'Installations électriques', det: 'Vérification annuelle' },
  { c: 'e4', d: 'erp', crit: true,  q: 'Extincteurs contrôlés dans l’année ?',                      l: 'Contrôle des extincteurs', det: 'Vérification annuelle' },
  { c: 'e5', d: 'erp', crit: true,  q: 'Alarme incendie testée et fonctionnelle ?',                 l: 'Alarme incendie', det: 'Test périodique' },
  { c: 'e6', d: 'erp', crit: false, q: 'Désenfumage vérifié ?',                                     l: 'Désenfumage', det: 'Vérification périodique' },
  { c: 'e7', d: 'erp', crit: false, q: "Plan d'évacuation affiché à chaque niveau ?",               l: "Plan d'évacuation", det: 'Affichage par niveau' },
  { c: 'e8', d: 'erp', crit: false, q: 'Personnel formé au maniement des extincteurs ?',            l: 'Maniement des extincteurs', det: 'Formation du personnel' },
  { c: 'e9', d: 'erp', crit: false, q: 'Consignes de sécurité affichées dans les circulations ?',   l: 'Affichage obligatoire', det: 'Consignes dans les circulations' }
];

// ── RÉFÉRENTIEL : référents obligatoires ─────────────────────────────────
const DD2_REFERENTS = [
  { code: 'securite',   label: 'Référent sécurité',        c: '#a855f7' },
  { code: 'dpo',        label: 'Référent RGPD (DPO)',      c: '#64748b' },
  { code: 'harcelement',label: 'Référent harcèlement',     c: '#fb7185' },
  { code: 'ssiap',      label: 'Référent incendie (SSIAP)',c: '#22d3ee' }
];

// ── RÉFÉRENTIEL : risques suivis (rattachés à un domaine) ────────────────
const DD2_RISQUES = [
  { label: 'Incendie / évacuation',   d: 'erp' },
  { label: 'Données personnelles',    d: 'rgpd' },
  { label: 'Contentieux prud’homal',  d: 'travail' },
  { label: 'Sanction URSSAF',         d: 'social' }
];

const DD2_TYPES_VEILLE = [
  { v: 'LOI', c: '#22d3ee' }, { v: 'DÉC', c: '#ec4899' }, { v: 'CCN', c: '#818cf8' },
  { v: 'ARR', c: '#f59e0b' }, { v: 'CIR', c: '#10b981' }
];

// ── État ─────────────────────────────────────────────────────────────────
let DD2_OBL = [];   // conformite_obligations
let DD2_ACT = [];   // conformite_actions
let DD2_VEI = [];   // conformite_veille
let DD2_REF = [];   // conformite_referents
let DD2_SCO = [];   // conformite_scores
const DD2_MISS = new Set();
let DD2_DOM = 'sst';   // domaine sélectionné pour l'auto-diagnostic
let DD2_MD = null;     // modale ouverte

// ── Utilitaires ──────────────────────────────────────────────────────────
function dd2Esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
function dd2Ini(n) {
  return String(n || '').trim().split(/\s+/).slice(0, 2).map(m => m[0] || '').join('').toUpperCase() || '?';
}
const DD2_MOIS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
function dd2JM(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return null;
  return { j: String(d.getDate()).padStart(2, '0'), m: DD2_MOIS[d.getMonth()], date: d };
}
function dd2Court(iso) { const x = dd2JM(iso); return x ? `${x.j}/${String(x.date.getMonth() + 1).padStart(2, '0')}` : '—'; }
function dd2Periode(d) {
  const dt = d || new Date();
  return 'T' + (Math.floor(dt.getMonth() / 3) + 1) + '-' + String(dt.getFullYear()).slice(2);
}

// Périmètre : encadrement RH uniquement (même règle que la RLS des tables).
function dd2IsRH() {
  if (typeof Auth === 'undefined') return false;
  if (typeof Auth.isRH === 'function') return Auth.isRH();
  return typeof Auth.isAdmin === 'function' && Auth.isAdmin();
}

// ── Accès Supabase (dégradation douce si la table n'existe pas) ──────────
function dd2Absente(e) {
  const msg = String((e && (e.message || e.details || e.hint)) || '');
  return (e && e.code === '42P01') || /does not exist|Could not find the table|schema cache/i.test(msg);
}
async function dd2Select(table) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return [];
  try {
    const { data, error } = await supabaseClient.from(table).select('*');
    if (error) {
      if (dd2Absente(error)) {
        DD2_MISS.add(table);
        console.warn(`[diagnostic-droits] table « ${table} » absente — exécutez ${DD2_SQL}`);
      } else {
        console.error(`[diagnostic-droits] lecture ${table}`, error);
      }
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn(`[diagnostic-droits] lecture ${table} impossible`, e);
    return [];
  }
}
function dd2RefuseSiAbsente(table) {
  if (!DD2_MISS.has(table)) return false;
  toast(`Table « ${table} » absente — exécutez ${DD2_SQL}`, 'error');
  return true;
}
function dd2RefuseSiPasRH() {
  if (dd2IsRH()) return false;
  toast('Action réservée à l’encadrement RH', 'error');
  return true;
}
async function dd2Upsert(table, row, id) {
  if (dd2RefuseSiPasRH() || dd2RefuseSiAbsente(table)) return null;
  try {
    const etab = await sbGetEtablissementId();
    const payload = { ...row, etablissement_id: etab, updated_at: new Date().toISOString() };
    const q = id
      ? supabaseClient.from(table).update(payload).eq('id', id).select()
      : supabaseClient.from(table).insert(payload).select();
    const { data, error } = await q;
    if (error) throw error;
    return (data && data[0]) || null;
  } catch (e) {
    if (dd2Absente(e)) { DD2_MISS.add(table); toast(`Table « ${table} » absente — exécutez ${DD2_SQL}`, 'error'); return null; }
    console.error(`[diagnostic-droits] écriture ${table}`, e);
    toast('Erreur : ' + (e?.message || e), 'error');
    return null;
  }
}
async function dd2Delete(table, id) {
  if (dd2RefuseSiPasRH() || dd2RefuseSiAbsente(table)) return false;
  try {
    const { error } = await supabaseClient.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error(`[diagnostic-droits] suppression ${table}`, e);
    toast('Erreur : ' + (e?.message || e), 'error');
    return false;
  }
}

async function dd2Load() {
  if (!dd2IsRH()) {
    // Hors encadrement RH : la RLS renverrait [] de toute façon, on ne lit pas.
    DD2_OBL = []; DD2_ACT = []; DD2_VEI = []; DD2_REF = []; DD2_SCO = [];
    return;
  }
  const [obl, act, vei, ref, sco] = await Promise.all([
    dd2Select(DD2_T_OBL), dd2Select(DD2_T_ACT), dd2Select(DD2_T_VEI),
    dd2Select(DD2_T_REF), dd2Select(DD2_T_SCO)
  ]);
  DD2_OBL = obl; DD2_ACT = act; DD2_VEI = vei; DD2_REF = ref; DD2_SCO = sco;
}

// ── Dérivations ──────────────────────────────────────────────────────────
function dd2Reponse(code) {
  const r = DD2_OBL.find(o => o.code === code);
  return r ? r.statut : '';                 // '' = non évaluée
}
// État consolidé d'une obligation : conforme | non_conforme | a_regulariser | non_evalue
function dd2Etat(o) {
  const s = dd2Reponse(o.c);
  if (s === 'conforme') return 'conforme';
  if (s === 'non_conforme') return o.crit ? 'non_conforme' : 'a_regulariser';
  return 'non_evalue';
}
function dd2ObligationsDe(dom) { return DD2_OBLIGATIONS.filter(o => o.d === dom); }
function dd2Compte() {
  const t = { conforme: 0, a_regulariser: 0, non_conforme: 0, non_evalue: 0 };
  DD2_OBLIGATIONS.forEach(o => { t[dd2Etat(o)]++; });
  return t;
}
function dd2ScoreDomaine(dom) {
  const list = dd2ObligationsDe(dom);
  const evalues = list.filter(o => dd2Etat(o) !== 'non_evalue');
  if (!evalues.length) return null;                       // jamais 0 % inventé
  const ok = evalues.filter(o => dd2Etat(o) === 'conforme').length;
  return { pct: Math.round(ok / evalues.length * 100), evalues: evalues.length, total: list.length, ok };
}
function dd2ScoreGlobal() {
  const t = dd2Compte();
  const evalues = t.conforme + t.a_regulariser + t.non_conforme;
  if (!evalues) return null;
  return { pct: Math.round(t.conforme / evalues * 100), conforme: t.conforme, evalues, total: DD2_OBLIGATIONS.length };
}
function dd2Niveau(pct) {
  if (pct >= 90) return { c: '#10b981', tag: 'Conforme', tc: '#34d399' };
  if (pct >= 70) return { c: '#f59e0b', tag: 'À surveiller', tc: '#f59e0b' };
  return { c: '#ef4444', tag: 'Non conforme', tc: '#ef4444' };
}
function dd2Vigilances() {
  const ordre = { non_conforme: 0, a_regulariser: 1, non_evalue: 2 };
  const tags = {
    non_conforme:  { tag: 'Urgent',      c: '#ef4444' },
    a_regulariser: { tag: 'Important',   c: '#f59e0b' },
    non_evalue:    { tag: 'À vérifier',  c: '#8095b4' }
  };
  return DD2_OBLIGATIONS
    .map(o => ({ o, e: dd2Etat(o) }))
    .filter(x => x.e !== 'conforme')
    .sort((a, b) => ordre[a.e] - ordre[b.e])
    .map(x => ({ code: x.o.c, label: x.o.l, detail: x.o.det, dom: x.o.d, ...tags[x.e] }));
}
function dd2ActionsTriees() {
  return DD2_ACT.slice().sort((a, b) => {
    if (!!a.fait !== !!b.fait) return a.fait ? 1 : -1;
    return String(a.echeance || '9999').localeCompare(String(b.echeance || '9999'));
  });
}

// ── Rendu : score global + tuiles ────────────────────────────────────────
function dd2RenderScore() {
  const el = document.getElementById('dd2Score');
  const st = document.getElementById('dd2Stats');
  if (!el || !st) return;
  const g = dd2ScoreGlobal();
  const t = dd2Compte();

  const turn = g ? (g.pct / 100).toFixed(3) : '0';
  const anneau = g
    ? `conic-gradient(#34d399 0turn ${turn}turn, rgba(255,255,255,.09) ${turn}turn 1turn)`
    : 'rgba(255,255,255,.09)';
  el.innerHTML = `
    <div class="dd2-ring" style="background:${anneau}">
      <div class="dd2-ring-in">
        <span class="dd2-ring-v">${g ? g.pct + '%' : '—'}</span>
        <span class="dd2-ring-l">conformité</span>
      </div>
    </div>
    <div>
      <div class="dd2-score-t">Score global</div>
      <div class="dd2-score-s">${g
        ? `${g.conforme} obligation${g.conforme > 1 ? 's' : ''} conforme${g.conforme > 1 ? 's' : ''} sur ${g.evalues} évaluée${g.evalues > 1 ? 's' : ''}.<br>${t.a_regulariser + t.non_conforme} point${(t.a_regulariser + t.non_conforme) > 1 ? 's' : ''} de vigilance, ${t.non_evalue} non évaluée${t.non_evalue > 1 ? 's' : ''}.`
        : `Aucune obligation évaluée.<br>Répondez à l’auto-diagnostic pour obtenir un score.`}</div>
    </div>`;

  const tuiles = [
    { n: t.conforme,      l: 'Obligations conformes', c: '#10b981', ic: 'check' },
    { n: t.a_regulariser, l: 'À régulariser',         c: '#f59e0b', ic: 'alert' },
    { n: t.non_conforme,  l: 'Non conformes',         c: '#ef4444', ic: 'shield' }
  ];
  st.innerHTML = tuiles.map(x => `
    <div class="dc-kpi" style="--dc-c:${x.c}">
      <div class="dc-kpi-top"><span class="dc-kpi-label">${x.l}</span><span class="dc-kpi-ico" style="color:${x.c}">${dd2Svg(x.ic, 15)}</span></div>
      <div class="dc-kpi-val" style="color:${x.c}">${x.n}</div>
    </div>`).join('');
}

// ── Rendu : domaines de conformité ───────────────────────────────────────
function dd2RenderDomaines() {
  const el = document.getElementById('dd2Domaines');
  if (!el) return;
  el.innerHTML = DD2_DOMAINES.map(d => {
    const s = dd2ScoreDomaine(d.id);
    const n = s ? dd2Niveau(s.pct) : { c: '#8095b4', tag: 'Non évalué', tc: '#8095b4' };
    const pct = s ? s.pct + '%' : '—';
    return `
      <button type="button" class="dd2-dom${DD2_DOM === d.id ? ' on' : ''}" data-dom="${d.id}"
              style="border-left:3px solid ${d.c}"
              onclick="dd2ChoisirDomaine('${d.id}')" aria-pressed="${DD2_DOM === d.id}">
        <span class="dd2-dom-ic" style="--pc:${d.c}">${dd2Svg(d.ic, 19)}</span>
        <span class="dd2-dom-txt">
          <span class="dd2-dom-l">${dd2Esc(d.label)}</span>
          <span class="dd2-dom-d">${dd2Esc(d.detail)}${s ? ` · ${s.evalues}/${s.total} évaluées` : ''}</span>
        </span>
        <span class="dd2-dom-bar"><span class="v2-prog"><span style="width:${s ? s.pct : 0}%;background:${n.c}"></span></span></span>
        <span class="dd2-dom-pct" style="color:${n.c}">${pct}</span>
        <span class="dc-badge" style="background:${n.tc}1f;color:${n.tc};border:1px solid ${n.tc}44"><span class="d" style="background:${n.tc}"></span>${dd2Esc(n.tag)}</span>
      </button>`;
  }).join('');
}

// ── Rendu : points de vigilance ──────────────────────────────────────────
function dd2RenderVigilance() {
  const el = document.getElementById('dd2Vigilance');
  if (!el) return;
  const list = dd2Vigilances();
  if (!list.length) {
    el.innerHTML = `<div class="v2-blk-vide">${DD2_MISS.has(DD2_T_OBL)
      ? `Table « ${DD2_T_OBL} » absente — exécutez ${DD2_SQL}.`
      : 'Aucun point de vigilance : toutes les obligations évaluées sont conformes.'}</div>`;
    return;
  }
  const MAX = 6;
  el.innerHTML = list.slice(0, MAX).map(v => `
    <div class="dd2-vig">
      <span class="dd2-vig-dot" style="background:${v.c}"></span>
      <div class="dd2-vig-b">
        <div class="dd2-vig-l">${dd2Esc(v.label)}</div>
        <div class="dd2-vig-d">${dd2Esc(v.detail)}</div>
      </div>
      <span class="dc-badge" style="background:${v.c}1f;color:${v.c};border:1px solid ${v.c}44"><span class="d" style="background:${v.c}"></span>${dd2Esc(v.tag)}</span>
    </div>`).join('')
    + (list.length > MAX ? `<div class="dd2-vig-plus">+ ${list.length - MAX} autre${list.length - MAX > 1 ? 's' : ''}</div>` : '');
}

// ── Rendu : plan d'action ────────────────────────────────────────────────
function dd2RenderActions() {
  const el = document.getElementById('dd2Actions');
  if (!el) return;
  if (DD2_MISS.has(DD2_T_ACT)) {
    el.innerHTML = `<div class="v2-blk-vide">Table « ${DD2_T_ACT} » absente — exécutez ${DD2_SQL}.</div>`;
    return;
  }
  const list = dd2ActionsTriees();
  if (!list.length) { el.innerHTML = `<div class="v2-blk-vide">Aucune action planifiée.</div>`; return; }
  el.innerHTML = list.slice(0, 8).map(a => {
    const bc = a.fait ? '#34d399' : (a.priorite === 'urgente' ? '#ef4444' : '#f59e0b');
    return `
      <div class="dd2-act">
        <button type="button" class="dd2-act-box" style="border-color:${bc};background:${a.fait ? bc : 'transparent'}"
                onclick="dd2ToggleAction('${a.id}')" aria-label="Marquer comme ${a.fait ? 'à faire' : 'faite'}"
                aria-pressed="${!!a.fait}">
          ${a.fait ? '<svg viewBox="0 0 24 24" fill="none" stroke="#0a1728" stroke-width="3.5" style="width:12px;height:12px"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </button>
        <button type="button" class="dd2-act-l${a.fait ? ' done' : ''}" onclick="dd2OpenAction('${a.id}')">${dd2Esc(a.label)}</button>
        <span class="dd2-act-e">${a.echeance ? dd2Court(a.echeance) : '—'}</span>
      </div>`;
  }).join('');
}

// ── Rendu : veille réglementaire ─────────────────────────────────────────
function dd2RenderVeille() {
  const el = document.getElementById('dd2Veille');
  if (!el) return;
  if (DD2_MISS.has(DD2_T_VEI)) {
    el.innerHTML = `<div class="v2-blk-vide">Table « ${DD2_T_VEI} » absente — exécutez ${DD2_SQL}.</div>`;
    return;
  }
  if (!DD2_VEI.length) { el.innerHTML = `<div class="v2-blk-vide">Aucun texte suivi.</div>`; return; }
  const cdt = t => (DD2_TYPES_VEILLE.find(x => x.v === t) || { c: '#818cf8' }).c;
  el.innerHTML = DD2_VEI.slice()
    .sort((a, b) => String(b.date_info || '').localeCompare(String(a.date_info || '')))
    .slice(0, 6)
    .map(v => `
      <button type="button" class="dd2-vei" onclick="dd2OpenVeille('${v.id}')">
        <span class="dd2-vei-t" style="color:${cdt(v.type)};background:${cdt(v.type)}1c">${dd2Esc(v.type)}</span>
        <span class="dd2-vei-b">
          <span class="dd2-vei-l">${dd2Esc(v.titre)}</span>
          <span class="dd2-vei-d">${dd2Esc(v.info || '')}</span>
        </span>
      </button>`).join('');
}

// ── Rendu : auto-diagnostic ──────────────────────────────────────────────
function dd2ChoisirDomaine(id) {
  DD2_DOM = id;
  dd2RenderDomaines();
  dd2RenderQuestions();
  const q = document.getElementById('dd2QBlock');
  if (q) q.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function dd2RenderQuestions() {
  const el = document.getElementById('dd2Questions');
  const ti = document.getElementById('dd2QTitre');
  const me = document.getElementById('dd2QMeta');
  if (!el) return;
  const dom = DD2_DOMAINES.find(d => d.id === DD2_DOM) || DD2_DOMAINES[0];
  const list = dd2ObligationsDe(dom.id);
  const rep = list.filter(o => dd2Reponse(o.c)).length;
  if (ti) ti.textContent = 'Auto-diagnostic — ' + dom.label;
  if (me) {
    me.textContent = `${rep} / ${list.length} répondues`;
    me.style.color = rep === list.length ? '#34d399' : '#f59e0b';
  }
  el.innerHTML = list.map(o => {
    const r = dd2Reponse(o.c);
    return `
      <div class="dd2-q">
        <span class="dd2-q-l">${dd2Esc(o.q)}</span>
        <span class="dd2-q-a">
          <button type="button" class="dd2-q-b oui${r === 'conforme' ? ' on' : ''}" onclick="dd2Repondre('${o.c}','conforme')">Oui</button>
          <button type="button" class="dd2-q-b non${r === 'non_conforme' ? ' on' : ''}" onclick="dd2Repondre('${o.c}','non_conforme')">Non</button>
        </span>
      </div>`;
  }).join('');
}
async function dd2Repondre(code, statut) {
  const existant = DD2_OBL.find(o => o.code === code);
  // Re-cliquer la même réponse efface l'évaluation (retour à « non évaluée »).
  if (existant && existant.statut === statut) {
    if (!await dd2Delete(DD2_T_OBL, existant.id)) return;
    DD2_OBL = DD2_OBL.filter(o => o.id !== existant.id);
  } else {
    const row = { code, statut, evalue_le: today() };
    // Identifiant Supabase Auth (jamais Auth.getSession().userId, qui est un
    // identifiant applicatif et serait rejeté par la RLS).
    try { if (typeof sbAuthUid === 'function') row.evalue_par = await sbAuthUid(); }
    catch { /* session Supabase indisponible : champ laissé vide */ }
    const saved = await dd2Upsert(DD2_T_OBL, row, existant ? existant.id : null);
    if (!saved) return;
    DD2_OBL = DD2_OBL.filter(o => o.id !== saved.id && o.code !== code).concat(saved);
  }
  dd2Render();
}

// ── Rendu : évolution du score ───────────────────────────────────────────
function dd2RenderEvolution() {
  const el = document.getElementById('dd2Evolution');
  const de = document.getElementById('dd2Delta');
  if (!el) return;
  const g = dd2ScoreGlobal();
  const hist = DD2_SCO.slice()
    .sort((a, b) => String(a.date_releve || '').localeCompare(String(b.date_releve || '')))
    .slice(-5);
  const cols = hist.map(h => ({ label: h.periode || dd2Periode(h.date_releve ? new Date(h.date_releve) : null), val: Number(h.valeur) }));
  if (g) cols.push({ label: 'Auj.', val: g.pct });

  if (de) {
    if (cols.length >= 2) {
      const d = cols[cols.length - 1].val - cols[0].val;
      de.textContent = (d >= 0 ? '+' : '') + d + ' pts';
      de.style.color = d >= 0 ? '#34d399' : '#fca5a5';
    } else { de.textContent = '—'; de.style.color = '#8095b4'; }
  }
  if (!cols.length) {
    el.innerHTML = `<div class="v2-blk-vide">${DD2_MISS.has(DD2_T_SCO)
      ? `Table « ${DD2_T_SCO} » absente — exécutez ${DD2_SQL}.`
      : 'Aucun relevé : évaluez les obligations puis enregistrez un relevé.'}</div>`;
    return;
  }
  const min = Math.min(...cols.map(c => c.val), 100) - 10;
  const base = Math.max(0, Math.min(min, 60));
  el.innerHTML = `<div class="dd2-chart">` + cols.map(c => {
    const h = Math.max(6, Math.round((c.val - base) / (100 - base) * 100));
    return `<div class="dd2-chart-c">
        <div class="dd2-chart-v">${c.val}%</div>
        <div class="dd2-chart-b" style="height:${h}%"></div>
        <div class="dd2-chart-l">${dd2Esc(c.label)}</div>
      </div>`;
  }).join('') + `</div>`;
}
async function dd2Releve() {
  const g = dd2ScoreGlobal();
  if (!g) { toast('Aucune obligation évaluée : rien à relever', 'error'); return; }
  const per = dd2Periode();
  const existant = DD2_SCO.find(s => s.periode === per);
  const saved = await dd2Upsert(DD2_T_SCO,
    { periode: per, valeur: g.pct, date_releve: today() },
    existant ? existant.id : null);
  if (!saved) return;
  DD2_SCO = DD2_SCO.filter(s => s.id !== saved.id).concat(saved);
  toast(`Relevé ${per} enregistré à ${g.pct} %`, 'success');
  dd2Render();
}

// ── Rendu : exposition aux risques ───────────────────────────────────────
function dd2RenderRisques() {
  const el = document.getElementById('dd2Risques');
  if (!el) return;
  el.innerHTML = DD2_RISQUES.map(r => {
    const dom = DD2_DOMAINES.find(d => d.id === r.d);
    const s = dd2ScoreDomaine(r.d);
    let tag, c, detail;
    if (!s) { tag = 'Non évalué'; c = '#8095b4'; detail = `${dom ? dom.label : ''} — à évaluer`; }
    else {
      const manque = dd2ObligationsDe(r.d).find(o => dd2Etat(o) === 'non_conforme')
                  || dd2ObligationsDe(r.d).find(o => dd2Etat(o) === 'a_regulariser');
      if (s.pct < 70)      { tag = 'Élevé';  c = '#ef4444'; }
      else if (s.pct < 90) { tag = 'Moyen';  c = '#f59e0b'; }
      else                 { tag = 'Faible'; c = '#34d399'; }
      detail = manque ? manque.l : `${dom ? dom.label : ''} conforme`;
    }
    return `<div class="dd2-risq">
        <div class="dd2-risq-b"><div class="dd2-risq-l">${dd2Esc(r.label)}</div><div class="dd2-risq-d">${dd2Esc(detail)}</div></div>
        <span class="dc-badge" style="background:${c}1f;color:${c};border:1px solid ${c}44"><span class="d" style="background:${c}"></span>${tag}</span>
      </div>`;
  }).join('');
}

// ── Rendu : échéancier légal ─────────────────────────────────────────────
function dd2RenderEcheancier() {
  const el = document.getElementById('dd2Echeancier');
  if (!el) return;
  if (DD2_MISS.has(DD2_T_ACT)) {
    el.innerHTML = `<div class="v2-blk-vide">Table « ${DD2_T_ACT} » absente — exécutez ${DD2_SQL}.</div>`;
    return;
  }
  const list = DD2_ACT.filter(a => !a.fait && a.echeance)
    .sort((a, b) => String(a.echeance).localeCompare(String(b.echeance)))
    .slice(0, 6);
  if (!list.length) { el.innerHTML = `<div class="v2-blk-vide">Aucune échéance planifiée.</div>`; return; }
  const auj = today();
  el.innerHTML = list.map(a => {
    const x = dd2JM(a.echeance);
    const c = a.echeance < auj ? '#ef4444' : (a.priorite === 'urgente' ? '#f59e0b' : '#22d3ee');
    return `<div class="dd2-ech">
        <div class="dd2-ech-d"><div class="dd2-ech-j" style="color:${c}">${x ? x.j : '—'}</div><div class="dd2-ech-m">${x ? x.m : ''}</div></div>
        <span class="dd2-ech-l">${dd2Esc(a.label)}</span>
      </div>`;
  }).join('');
}

// ── Rendu : référents désignés ───────────────────────────────────────────
function dd2RenderReferents() {
  const el = document.getElementById('dd2Referents');
  if (!el) return;
  el.innerHTML = DD2_REFERENTS.map(r => {
    const row = DD2_REF.find(x => x.role_code === r.code);
    const nom = row && row.nom ? row.nom : '';
    const ok = !!nom;
    return `<button type="button" class="dd2-ref" onclick="dd2OpenReferent('${r.code}')">
        <span class="dd2-ref-av" style="background:${ok ? r.c : '#64748b'}">${ok ? dd2Ini(nom) : '?'}</span>
        <span class="dd2-ref-b">
          <span class="dd2-ref-r">${dd2Esc(r.label)}</span>
          <span class="dd2-ref-n">${ok ? dd2Esc(nom) : 'À désigner'}</span>
        </span>
        <span class="dd2-ref-s" style="color:${ok ? '#34d399' : '#fca5a5'}">
          ${ok
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" style="width:14px;height:14px"><polyline points="20 6 9 17 4 12"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" style="width:14px;height:14px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}
        </span>
      </button>`;
  }).join('');
}

// ── Rendu global ─────────────────────────────────────────────────────────
function dd2Render() {
  dd2RenderScore();
  dd2RenderDomaines();
  dd2RenderVigilance();
  dd2RenderActions();
  dd2RenderVeille();
  dd2RenderQuestions();
  dd2RenderEvolution();
  dd2RenderRisques();
  dd2RenderEcheancier();
  dd2RenderReferents();
}

// ── Modales (gabarit .v2-ov / .v2-md de css/v2.css) ──────────────────────
function dd2CloseModal() {
  const ov = document.getElementById('dd2Modal');
  if (ov) { ov.classList.remove('open'); ov.innerHTML = ''; }
  document.body.style.overflow = '';
  DD2_MD = null;
}
function dd2Modal(mode, opts) {
  const ov = document.getElementById('dd2Modal');
  if (!ov) return;
  DD2_MD = mode;
  ov.innerHTML = `
    <div class="v2-md" style="--mc:${opts.c}" role="dialog" aria-modal="true" aria-label="${dd2Esc(opts.titre)}">
      <div class="v2-md-h">
        <span class="v2-md-ico">${dd2Svg(opts.ic, 22)}</span>
        <div><div class="v2-md-t">${dd2Esc(opts.titre)}</div><div class="v2-md-s">${dd2Esc(opts.sous)}</div></div>
        <button type="button" class="v2-md-x" onclick="dd2CloseModal()" aria-label="Fermer">${dd2Svg('x', 16)}</button>
      </div>
      <div class="v2-md-b">${opts.body}</div>
      <div class="v2-md-f">${opts.foot}</div>
    </div>`;
  ov.classList.add('open');
  document.body.style.overflow = 'hidden';
  const f = ov.querySelector('.v2-fld');
  if (f) setTimeout(() => f.focus(), 60);
}

// Plan d'action — création / édition
function dd2OpenAction(id) {
  if (dd2RefuseSiPasRH() || dd2RefuseSiAbsente(DD2_T_ACT)) return;
  const a = id ? DD2_ACT.find(x => String(x.id) === String(id)) : null;
  const prio = a ? a.priorite : 'importante';
  dd2Modal('action', {
    c: '#f59e0b', ic: 'clip',
    titre: a ? 'Modifier l’action' : 'Nouvelle action',
    sous: 'Plan d’action de mise en conformité',
    body: `
      <input type="hidden" id="dd2ActId" value="${a ? dd2Esc(a.id) : ''}"/>
      <div><label class="v2-fld-l" for="dd2ActLabel">Intitulé *</label>
        <input class="v2-fld" type="text" id="dd2ActLabel" value="${a ? dd2Esc(a.label) : ''}" placeholder="Mettre à jour le DUERP"/></div>
      <div><label class="v2-fld-l" for="dd2ActDetail">Précision</label>
        <textarea class="v2-fld" id="dd2ActDetail" placeholder="Contexte, responsable…">${a ? dd2Esc(a.detail || '') : ''}</textarea></div>
      <div class="v2-grid2">
        <div><label class="v2-fld-l" for="dd2ActEch">Échéance</label>
          <input class="v2-fld" type="date" id="dd2ActEch" value="${a && a.echeance ? dd2Esc(a.echeance) : ''}"/></div>
        <div><label class="v2-fld-l" for="dd2ActObl">Obligation liée</label>
          <select class="v2-fld" id="dd2ActObl">
            <option value="">— Aucune —</option>
            ${DD2_OBLIGATIONS.map(o => `<option value="${o.c}"${a && a.obligation_code === o.c ? ' selected' : ''}>${dd2Esc(o.l)}</option>`).join('')}
          </select></div>
      </div>
      <div><label class="v2-fld-l">Priorité</label>
        <div class="v2-seg" id="dd2ActPrio">
          ${['urgente', 'importante', 'normale'].map(p => `<button type="button" class="v2-seg-o${prio === p ? ' on' : ''}" data-v="${p}" onclick="dd2Seg('dd2ActPrio',this)">${p[0].toUpperCase() + p.slice(1)}</button>`).join('')}
        </div></div>`,
    foot: `${a ? `<button type="button" class="v2-btn-sec" onclick="dd2SupprAction('${dd2Esc(a.id)}')">${dd2Svg('trash', 15)} Supprimer</button>` : ''}
      <button type="button" class="v2-btn-sec" onclick="dd2CloseModal()">Annuler</button>
      <button type="button" class="v2-btn-pri" onclick="dd2SaveAction()">Enregistrer</button>`
  });
}
function dd2Seg(groupe, btn) {
  const g = document.getElementById(groupe);
  if (!g) return;
  g.querySelectorAll('.v2-seg-o').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}
function dd2SegVal(groupe, def) {
  const on = document.querySelector('#' + groupe + ' .v2-seg-o.on');
  return on ? on.dataset.v : def;
}
async function dd2SaveAction() {
  const id = document.getElementById('dd2ActId').value || null;
  const label = document.getElementById('dd2ActLabel').value.trim();
  if (!label) { toast('Intitulé obligatoire', 'error'); return; }
  const row = {
    label,
    detail: document.getElementById('dd2ActDetail').value.trim(),
    echeance: document.getElementById('dd2ActEch').value || null,
    obligation_code: document.getElementById('dd2ActObl').value || '',
    priorite: dd2SegVal('dd2ActPrio', 'importante')
  };
  const saved = await dd2Upsert(DD2_T_ACT, row, id);
  if (!saved) return;
  DD2_ACT = DD2_ACT.filter(a => String(a.id) !== String(saved.id)).concat(saved);
  dd2CloseModal();
  toast('Action enregistrée ✓', 'success');
  dd2Render();
}
async function dd2SupprAction(id) {
  if (!confirm('Supprimer cette action ?')) return;
  if (!await dd2Delete(DD2_T_ACT, id)) return;
  DD2_ACT = DD2_ACT.filter(a => String(a.id) !== String(id));
  dd2CloseModal();
  toast('Action supprimée', 'info');
  dd2Render();
}
async function dd2ToggleAction(id) {
  const a = DD2_ACT.find(x => String(x.id) === String(id));
  if (!a) return;
  const fait = !a.fait;
  const saved = await dd2Upsert(DD2_T_ACT,
    { fait, fait_le: fait ? today() : null }, id);
  if (!saved) return;
  DD2_ACT = DD2_ACT.filter(x => String(x.id) !== String(saved.id)).concat(saved);
  dd2Render();
}

// Veille réglementaire — création / édition
function dd2OpenVeille(id) {
  if (dd2RefuseSiPasRH() || dd2RefuseSiAbsente(DD2_T_VEI)) return;
  const v = id ? DD2_VEI.find(x => String(x.id) === String(id)) : null;
  const type = v ? v.type : 'LOI';
  dd2Modal('veille', {
    c: '#22d3ee', ic: 'book',
    titre: v ? 'Modifier le texte suivi' : 'Nouveau texte suivi',
    sous: 'Veille réglementaire',
    body: `
      <input type="hidden" id="dd2VeiId" value="${v ? dd2Esc(v.id) : ''}"/>
      <div><label class="v2-fld-l">Nature du texte</label>
        <div class="v2-seg" id="dd2VeiType">
          ${DD2_TYPES_VEILLE.map(t => `<button type="button" class="v2-seg-o${type === t.v ? ' on' : ''}" data-v="${t.v}" onclick="dd2Seg('dd2VeiType',this)">${t.v}</button>`).join('')}
        </div></div>
      <div><label class="v2-fld-l" for="dd2VeiTitre">Intitulé *</label>
        <input class="v2-fld" type="text" id="dd2VeiTitre" value="${v ? dd2Esc(v.titre) : ''}" placeholder="Avenant CCN 66 — revalorisation"/></div>
      <div class="v2-grid2">
        <div><label class="v2-fld-l" for="dd2VeiInfo">Mention affichée</label>
          <input class="v2-fld" type="text" id="dd2VeiInfo" value="${v ? dd2Esc(v.info || '') : ''}" placeholder="Applicable 01/2027"/></div>
        <div><label class="v2-fld-l" for="dd2VeiDate">Date de référence</label>
          <input class="v2-fld" type="date" id="dd2VeiDate" value="${v && v.date_info ? dd2Esc(v.date_info) : ''}"/></div>
      </div>
      <div><label class="v2-fld-l" for="dd2VeiLien">Lien (Légifrance…)</label>
        <input class="v2-fld" type="url" id="dd2VeiLien" value="${v ? dd2Esc(v.lien || '') : ''}" placeholder="https://"/></div>`,
    foot: `${v ? `<button type="button" class="v2-btn-sec" onclick="dd2SupprVeille('${dd2Esc(v.id)}')">${dd2Svg('trash', 15)} Supprimer</button>` : ''}
      <button type="button" class="v2-btn-sec" onclick="dd2CloseModal()">Annuler</button>
      <button type="button" class="v2-btn-pri" onclick="dd2SaveVeille()">Enregistrer</button>`
  });
}
async function dd2SaveVeille() {
  const id = document.getElementById('dd2VeiId').value || null;
  const titre = document.getElementById('dd2VeiTitre').value.trim();
  if (!titre) { toast('Intitulé obligatoire', 'error'); return; }
  const row = {
    titre,
    type: dd2SegVal('dd2VeiType', 'LOI'),
    info: document.getElementById('dd2VeiInfo').value.trim(),
    date_info: document.getElementById('dd2VeiDate').value || null,
    lien: document.getElementById('dd2VeiLien').value.trim()
  };
  const saved = await dd2Upsert(DD2_T_VEI, row, id);
  if (!saved) return;
  DD2_VEI = DD2_VEI.filter(v => String(v.id) !== String(saved.id)).concat(saved);
  dd2CloseModal();
  toast('Texte enregistré ✓', 'success');
  dd2Render();
}
async function dd2SupprVeille(id) {
  if (!confirm('Retirer ce texte de la veille ?')) return;
  if (!await dd2Delete(DD2_T_VEI, id)) return;
  DD2_VEI = DD2_VEI.filter(v => String(v.id) !== String(id));
  dd2CloseModal();
  toast('Texte retiré', 'info');
  dd2Render();
}

// Référent — désignation
function dd2OpenReferent(code) {
  if (dd2RefuseSiPasRH() || dd2RefuseSiAbsente(DD2_T_REF)) return;
  const r = DD2_REFERENTS.find(x => x.code === code);
  if (!r) return;
  const row = DD2_REF.find(x => x.role_code === code);
  dd2Modal('referent', {
    c: r.c, ic: 'user',
    titre: r.label,
    sous: 'Désignation du référent',
    body: `
      <input type="hidden" id="dd2RefCode" value="${dd2Esc(code)}"/>
      <input type="hidden" id="dd2RefId" value="${row ? dd2Esc(row.id) : ''}"/>
      <div><label class="v2-fld-l" for="dd2RefNom">Nom du référent</label>
        <input class="v2-fld" type="text" id="dd2RefNom" value="${row ? dd2Esc(row.nom || '') : ''}" placeholder="Prénom Nom"/></div>
      <div class="v2-grid2">
        <div><label class="v2-fld-l" for="dd2RefContact">Contact</label>
          <input class="v2-fld" type="text" id="dd2RefContact" value="${row ? dd2Esc(row.contact || '') : ''}" placeholder="Courriel ou poste"/></div>
        <div><label class="v2-fld-l" for="dd2RefDate">Désigné le</label>
          <input class="v2-fld" type="date" id="dd2RefDate" value="${row && row.designe_le ? dd2Esc(row.designe_le) : ''}"/></div>
      </div>
      <div class="v2-note v2-note-warn">${dd2Svg('alert', 16)}
        <span>Laisser le nom vide retire la désignation : le référent réapparaîtra « à désigner ».</span></div>`,
    foot: `<button type="button" class="v2-btn-sec" onclick="dd2CloseModal()">Annuler</button>
      <button type="button" class="v2-btn-pri" onclick="dd2SaveReferent()">Enregistrer</button>`
  });
}
async function dd2SaveReferent() {
  const code = document.getElementById('dd2RefCode').value;
  const id = document.getElementById('dd2RefId').value || null;
  const nom = document.getElementById('dd2RefNom').value.trim();
  if (!nom && id) {
    if (!await dd2Delete(DD2_T_REF, id)) return;
    DD2_REF = DD2_REF.filter(r => String(r.id) !== String(id));
    dd2CloseModal(); toast('Désignation retirée', 'info'); dd2Render(); return;
  }
  if (!nom) { toast('Nom du référent obligatoire', 'error'); return; }
  const row = {
    role_code: code, nom,
    contact: document.getElementById('dd2RefContact').value.trim(),
    designe_le: document.getElementById('dd2RefDate').value || null
  };
  const saved = await dd2Upsert(DD2_T_REF, row, id);
  if (!saved) return;
  DD2_REF = DD2_REF.filter(r => String(r.id) !== String(saved.id) && r.role_code !== code).concat(saved);
  dd2CloseModal();
  toast('Référent enregistré ✓', 'success');
  dd2Render();
}

// ── Rapport de conformité (impression / PDF) ─────────────────────────────
function dd2Rapport() {
  if (dd2RefuseSiPasRH()) return;
  const g = dd2ScoreGlobal();
  const t = dd2Compte();
  const dt = new Date().toLocaleDateString('fr-FR');
  const ligne = (a, b) => `<tr><td>${dd2Esc(a)}</td><td>${dd2Esc(b)}</td></tr>`;
  const doms = DD2_DOMAINES.map(d => {
    const s = dd2ScoreDomaine(d.id);
    return ligne(d.label, s ? `${s.pct} % — ${s.ok}/${s.evalues} conformes (${s.total} obligations)` : 'non évalué');
  }).join('');
  const vig = dd2Vigilances().map(v => `<li><strong>${dd2Esc(v.label)}</strong> — ${dd2Esc(v.detail)} (${v.tag})</li>`).join('')
    || '<li>Aucun point de vigilance.</li>';
  const act = dd2ActionsTriees().map(a =>
    `<li>${a.fait ? '[x]' : '[ ]'} ${dd2Esc(a.label)}${a.echeance ? ' — échéance ' + dd2Esc(a.echeance) : ''}</li>`).join('')
    || '<li>Aucune action planifiée.</li>';
  const refs = DD2_REFERENTS.map(r => {
    const row = DD2_REF.find(x => x.role_code === r.code);
    return ligne(r.label, row && row.nom ? row.nom : 'à désigner');
  }).join('');

  const w = window.open('', '_blank');
  if (!w) { toast('Autorisez les fenêtres surgissantes pour générer le rapport', 'error'); return; }
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
    <title>Rapport de conformité — ${dt}</title>
    <style>
      body{font-family:Inter,system-ui,sans-serif;color:#111827;margin:32px;line-height:1.5}
      h1{font-size:20px;margin:0 0 4px} h2{font-size:14px;margin:24px 0 8px;border-bottom:1px solid #d1d5db;padding-bottom:4px}
      .meta{color:#6b7280;font-size:12px;margin-bottom:18px}
      table{border-collapse:collapse;width:100%;font-size:12px}
      td{border-bottom:1px solid #e5e7eb;padding:6px 4px}
      ul{font-size:12px;padding-left:18px} .big{font-size:30px;font-weight:800}
    </style></head><body>
    <h1>Rapport de conformité — droits &amp; obligations</h1>
    <div class="meta">Édité le ${dt}</div>
    <div class="big">${g ? g.pct + ' %' : '—'}</div>
    <div class="meta">${g ? `${g.conforme} conformes / ${g.evalues} évaluées sur ${g.total} obligations du référentiel` : 'aucune obligation évaluée'}
      · ${t.a_regulariser} à régulariser · ${t.non_conforme} non conformes · ${t.non_evalue} non évaluées</div>
    <h2>Domaines de conformité</h2><table>${doms}</table>
    <h2>Points de vigilance</h2><ul>${vig}</ul>
    <h2>Plan d'action</h2><ul>${act}</ul>
    <h2>Référents désignés</h2><table>${refs}</table>
    </body></html>`);
  w.document.close();
  setTimeout(() => { try { w.print(); } catch (_) {} }, 350);
}

// ── Périmètre : la page entière est réservée à l'encadrement RH ──────────
function dd2Garde() {
  if (dd2IsRH()) return true;
  const body = document.getElementById('dd2Body');
  if (body) {
    body.innerHTML = `
      <div class="dd2-refus">
        <span class="dd2-refus-ic">${dd2Svg('shield', 26)}</span>
        <div class="dd2-refus-t">Module réservé à l’encadrement RH</div>
        <div class="dd2-refus-s">Le diagnostic des droits et obligations porte sur la responsabilité
          de l’employeur. Il n’est accessible qu’aux comptes RH, administrateur ou superadministrateur.</div>
        <a class="v2-btn" href="dashboard.html">${dd2Svg('back', 16)} Retour au tableau de bord</a>
      </div>`;
  }
  const act = document.getElementById('dd2TopActions');
  if (act) act.querySelectorAll('button').forEach(b => b.remove());
  return false;
}

// ── Amorçage ─────────────────────────────────────────────────────────────
async function dd2Init() {
  if (!document.getElementById('dd2Domaines')) return;
  if (!dd2Garde()) return;
  await dd2Load();
  dd2Render();
}
document.addEventListener('DOMContentLoaded', dd2Init);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && DD2_MD) dd2CloseModal(); });

// Un `const` de premier niveau ne crée PAS de propriété sur window : les
// constantes et fonctions lues par les onclick inline sont publiées ici.
window.DD2_SQL = DD2_SQL;
window.DD2_DOMAINES = DD2_DOMAINES;
window.DD2_OBLIGATIONS = DD2_OBLIGATIONS;
window.DD2_REFERENTS = DD2_REFERENTS;
window.DD2_RISQUES = DD2_RISQUES;
window.DD2_TYPES_VEILLE = DD2_TYPES_VEILLE;
window.dd2Init = dd2Init;
window.dd2Render = dd2Render;
window.dd2ChoisirDomaine = dd2ChoisirDomaine;
window.dd2Repondre = dd2Repondre;
window.dd2Releve = dd2Releve;
window.dd2OpenAction = dd2OpenAction;
window.dd2SaveAction = dd2SaveAction;
window.dd2SupprAction = dd2SupprAction;
window.dd2ToggleAction = dd2ToggleAction;
window.dd2OpenVeille = dd2OpenVeille;
window.dd2SaveVeille = dd2SaveVeille;
window.dd2SupprVeille = dd2SupprVeille;
window.dd2OpenReferent = dd2OpenReferent;
window.dd2SaveReferent = dd2SaveReferent;
window.dd2CloseModal = dd2CloseModal;
window.dd2Seg = dd2Seg;
window.dd2Rapport = dd2Rapport;
window.dd2IsRH = dd2IsRH;
