// ── FORMATION (RH) — DESIGN V2 ────────────────────────────────────────────
// Reproduit la maquette « Formation (RH) » : tuiles statistiques, chips de
// catégorie, tableau des formations, bloc « obligatoires à renouveler »,
// rail (budget, heures par catégorie, prochaines sessions) puis les blocs
// bas de page (plan de développement, CPF, évaluations, attestations,
// organismes partenaires).
//
// Les données et les actions des formations restent celles de js/formations.js
// et js/formations-supabase.js (aucun de ces fichiers n'est modifié).
// Les blocs de la maquette sans source en base s'appuient sur les tables
// créées par migration-formations.sql — tant qu'il n'est pas exécuté, la
// lecture renvoie [] avec un console.warn et l'écriture est refusée par un
// toast nommant le fichier. Aucune valeur n'est inventée.

const FR2_SQL = 'migration-formations.sql';
const FR2_SQL_EVAL = 'migration-mes-formations.sql'; // table formation_evaluations (lecture seule ici)

const FR2_T_BUDGET = 'formation_budgets';
const FR2_T_OBLIG  = 'formation_obligations';
const FR2_T_PARC   = 'formation_parcours';
const FR2_T_CPF    = 'formation_cpf';
const FR2_T_ATT    = 'formation_attestations';
const FR2_T_ORG    = 'formation_organismes';
const FR2_T_EVAL   = 'formation_evaluations';

const FR2_IC = {
  book:  '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  euro:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21l8.84-8.61a5.5 5.5 0 0 0 0-7.78z"/>',
  fire:  '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  grad:  '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5L17 22l-5-3-5 3 1.5-8.5"/>',
  cal:   '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>',
  card:  '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  star:  '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  file:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  dl:    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  plus:  '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  pen:   '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  undo:  '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  x:     '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'
};

// Catégories de la maquette. Le référentiel en base est le « domaine » :
// on regroupe les domaines existants dans les quatre familles dessinées.
const FR2_CAT = {
  obligatoire: { l: 'Obligatoire', c: '#ef4444' },
  metier:      { l: 'Métier',      c: '#16a34a' },
  securite:    { l: 'Sécurité',    c: '#f59e0b' },
  management:  { l: 'Management',  c: '#818cf8' }
};
const FR2_DOM_CAT = {
  "Sécurité & gestes d'urgence":            'securite',
  'Réglementation & droit des usagers':     'obligatoire',
  'Management & encadrement':               'management',
  'Accompagnement éducatif & pédagogique':  'metier',
  'Communication & gestion des conflits':   'metier',
  'Hygiène, santé & soins':                 'metier',
  'Numérique & outils professionnels':      'metier',
  'Autre':                                  'metier'
};
const FR2_CAT_ICO = { obligatoire: FR2_IC.shield, metier: FR2_IC.grad, securite: FR2_IC.fire, management: FR2_IC.users };
const FR2_MOIS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
const FR2_PAL = ['#22d3ee', '#f59e0b', '#a855f7', '#10b981', '#ec4899', '#818cf8', '#38bdf8', '#4ade80'];

// ── État du module ───────────────────────────────────────────────────────
let FR2_BUDGETS = [];
let FR2_OBLIG   = [];
let FR2_PARC    = [];
let FR2_CPF     = [];
let FR2_ATT     = [];
let FR2_ORG     = [];
let FR2_EVALS   = [];
const FR2_MISS  = new Set();   // tables absentes en base
let FR2_FILTRE  = 'all';       // catégorie sélectionnée
let FR2_FORM    = { kind: null, id: null };

// ── Utilitaires ──────────────────────────────────────────────────────────
function fr2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
function fr2Today() { return new Date().toISOString().slice(0, 10); }
function fr2Num(n) { return (Number(n) || 0).toLocaleString('fr-FR'); }
function fr2Eur0(n) { return fr2Num(Math.round(Number(n) || 0)) + ' €'; }
function fr2Cat(f) { return FR2_DOM_CAT[f && f.domaine] || 'metier'; }
function fr2Ini(s) {
  const mots = String(s || '').trim().split(/[\s\-']+/).filter(Boolean);
  if (!mots.length) return '?';
  // Un seul mot (« Cegos », « ANFH ») : deux premières lettres, comme la maquette.
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return mots.slice(0, 2).map(x => x[0]).join('').toUpperCase();
}
function fr2Color(s) {
  const k = String(s || '');
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 9973;
  return FR2_PAL[h % FR2_PAL.length];
}
function fr2Emp(id) {
  const e = (typeof _frmEmployesCache !== 'undefined' ? _frmEmployesCache : []).find(x => String(x.id) === String(id));
  return e || null;
}
function fr2EmpNom(id) {
  const e = fr2Emp(id);
  return e ? `${e.prenom} ${e.nom}`.trim() : '';
}
function fr2EmpActifs() {
  return (typeof _frmEmployesCache !== 'undefined' ? _frmEmployesCache : []).filter(e => e.statut !== 'inactif');
}
function fr2Pastille(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return { j: '--', m: '' };
  return { j: String(d.getDate()).padStart(2, '0'), m: FR2_MOIS[d.getMonth()] || '' };
}
function fr2AddMois(iso, mois) {
  if (!iso || !mois) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  d.setMonth(d.getMonth() + Number(mois));
  return d.toISOString().slice(0, 10);
}
function fr2Jours(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return null;
  return Math.round((d - new Date(fr2Today() + 'T00:00:00')) / 86400000);
}
function fr2Statut(f) {
  if (f.statut === 'annulee') return { l: 'Annulée', c: '#8095b4' };
  if (f.statut === 'realisee') return { l: 'Terminée', c: '#10b981' };
  const t = fr2Today(), a = f.dateDebut, b = f.dateFin || f.dateDebut;
  if (a && a <= t && (!b || b >= t)) return { l: 'En cours', c: '#f59e0b' };
  return { l: 'Planifiée', c: '#22d3ee' };
}
function fr2Dates(f) {
  if (!f.dateDebut) return '—';
  const a = formatDate(f.dateDebut);
  if (f.dateFin && f.dateFin !== f.dateDebut) return a + ' → ' + formatDate(f.dateFin);
  return a;
}
// Encadrement : voit le budget, les parcours, les compteurs CPF et les
// attestations. Le contrôle d'écriture reste, lui, réservé aux admins
// (identique à js/formations.js) — rien n'est desserré.
function fr2IsRH() { return typeof Auth !== 'undefined' && Auth.isRH && Auth.isRH(); }
function fr2IsAdmin() { return typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin(); }

// ── Accès Supabase (dégradation douce si la table n'existe pas) ──────────
function fr2Absente(e) {
  const msg = String((e && (e.message || e.details || e.hint)) || '');
  return (e && e.code === '42P01') || /does not exist|Could not find the table|schema cache/i.test(msg);
}
async function fr2Select(table, order) {
  try {
    let q = supabaseClient.from(table).select('*');
    if (order) q = q.order(order, { ascending: true });
    const { data, error } = await q;
    if (error) {
      if (fr2Absente(error)) {
        FR2_MISS.add(table);
        console.warn(`[formations] table « ${table} » absente — exécutez ${table === FR2_T_EVAL ? FR2_SQL_EVAL : FR2_SQL}`);
      } else {
        console.error(`[formations] lecture ${table}`, error);
      }
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn(`[formations] lecture ${table} impossible`, e);
    return [];
  }
}
function fr2RefuseSiAbsente(table) {
  if (!FR2_MISS.has(table)) return false;
  toast(`Table « ${table} » absente — exécutez ${FR2_SQL}`, 'error');
  return true;
}
async function fr2Upsert(table, row, id) {
  if (fr2RefuseSiAbsente(table)) return null;
  if (!fr2IsAdmin()) { toast('Action réservée aux administrateurs', 'error'); return null; }
  try {
    if (!row.etablissement_id) row.etablissement_id = await sbGetEtablissementId();
    const q = id
      ? supabaseClient.from(table).update(row).eq('id', id).select()
      : supabaseClient.from(table).insert(row).select();
    const { data, error } = await q;
    if (error) throw error;
    return (data && data[0]) || null;
  } catch (e) {
    if (fr2Absente(e)) { FR2_MISS.add(table); toast(`Table « ${table} » absente — exécutez ${FR2_SQL}`, 'error'); return null; }
    console.error(`[formations] écriture ${table}`, e);
    toast('Erreur : ' + (e && (e.message || e.details) || e), 'error');
    return null;
  }
}
async function fr2Delete(table, id) {
  if (fr2RefuseSiAbsente(table)) return false;
  if (!fr2IsAdmin()) { toast('Action réservée aux administrateurs', 'error'); return false; }
  try {
    const { error } = await supabaseClient.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error(`[formations] suppression ${table}`, e);
    toast('Erreur : ' + (e && (e.message || e.details) || e), 'error');
    return false;
  }
}
// uid réel du compte Supabase : 1er segment obligatoire des chemins Storage.
async function fr2AuthUid() {
  try {
    const { data } = await supabaseClient.auth.getUser();
    return (data && data.user && data.user.id) || null;
  } catch (e) { console.error('[fr2AuthUid]', e); return null; }
}

async function fr2LoadExtras() {
  const rh = fr2IsRH();
  const [budgets, oblig, parc, cpf, att, org, evals] = await Promise.all([
    rh ? fr2Select(FR2_T_BUDGET, 'annee') : Promise.resolve([]),
    fr2Select(FR2_T_OBLIG, 'libelle'),
    rh ? fr2Select(FR2_T_PARC, 'created_at') : Promise.resolve([]),
    rh ? fr2Select(FR2_T_CPF, 'created_at') : Promise.resolve([]),
    rh ? fr2Select(FR2_T_ATT, 'created_at') : Promise.resolve([]),
    fr2Select(FR2_T_ORG, 'nom'),
    fr2Select(FR2_T_EVAL, 'created_at')
  ]);
  FR2_BUDGETS = budgets; FR2_OBLIG = oblig; FR2_PARC = parc;
  FR2_CPF = cpf; FR2_ATT = att; FR2_ORG = org; FR2_EVALS = evals;
}

// ── Sélection courante ───────────────────────────────────────────────────
function fr2Annee() {
  const s = document.getElementById('frmFiltreAnnee');
  return (s && s.value) || '';
}
function fr2AnneeRef() { return fr2Annee() || String(new Date().getFullYear()); }
function fr2Liste() { return (typeof _frmCache !== 'undefined' ? _frmCache : []); }
function fr2Filtrees() {
  const annee = fr2Annee();
  const statut = (document.getElementById('frmFiltreStatut') || {}).value || '';
  const domaine = (document.getElementById('frmFiltreDomaine') || {}).value || '';
  return fr2Liste().filter(f => {
    if (annee && !String(f.dateDebut || '').startsWith(annee)) return false;
    if (statut && f.statut !== statut) return false;
    if (domaine && f.domaine !== domaine) return false;
    if (FR2_FILTRE !== 'all' && fr2Cat(f) !== FR2_FILTRE) return false;
    return true;
  }).sort((a, b) => String(b.dateDebut || '').localeCompare(String(a.dateDebut || '')));
}

function fr2SetFiltre(id) { FR2_FILTRE = id; fr2Render(); }

// ── Rendu : tuiles statistiques ──────────────────────────────────────────
function fr2RenderStats() {
  const el = document.getElementById('fr2Stats');
  if (!el) return;
  const annee = fr2Annee();
  const list = fr2Filtrees();
  const heures = list.filter(f => f.statut === 'realisee').reduce((a, f) => a + (Number(f.dureeHeures) || 0), 0);
  const engage = list.filter(f => f.statut !== 'annulee').reduce((a, f) => a + (Number(f.cout) || 0), 0);

  const b = FR2_BUDGETS.find(x => String(x.annee) === fr2AnneeRef());
  const env = b ? Number(b.enveloppe) || 0 : 0;
  const budgetVal = env > 0 ? Math.round(engage / env * 100) + ' %' : fr2Eur0(engage);
  const budgetLbl = env > 0 ? `Budget engagé (sur ${fr2Eur0(env)})` : 'Budget engagé';

  let obligN = '—', obligL = 'Obligations échues';
  if (FR2_MISS.has(FR2_T_OBLIG)) {
    obligL = 'Obligations (table absente)';
  } else {
    obligN = String(FR2_OBLIG.filter(o => { const j = fr2Jours(fr2ObligEcheance(o)); return j !== null && j < 0; }).length);
  }

  const cards = [
    { n: String(list.length), l: 'Sessions' + (annee ? ` (${annee})` : ' (toutes années)'), c: '#16a34a', i: FR2_IC.book },
    { n: (Math.round(heures * 10) / 10).toLocaleString('fr-FR') + ' h', l: 'Heures dispensées', c: '#22d3ee', i: FR2_IC.clock },
    { n: budgetVal, l: budgetLbl, c: '#4ade80', i: FR2_IC.euro },
    { n: obligN, l: obligL, c: '#ef4444', i: FR2_IC.alert }
  ];
  el.innerHTML = cards.map(c => `<div class="fr2-stat" style="--pc:${c.c}">
      <span class="fr2-stat-ico">${fr2Svg(c.i)}</span>
      <div class="fr2-stat-txt"><div class="fr2-stat-n">${escHtml(c.n)}</div><div class="fr2-stat-l">${escHtml(c.l)}</div></div>
    </div>`).join('');

  // Compatibilité : les compteurs hérités restent alimentés.
  const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
  set('frmStatPlanifiees', list.filter(f => f.statut === 'planifiee').length);
  set('frmStatRealisees', list.filter(f => f.statut === 'realisee').length);
  set('frmStatParticipants', list.reduce((a, f) => a + (f.participants || []).length, 0));
  set('frmStatBudget', frmEur(engage));
}

// ── Rendu : chips de catégorie + années ──────────────────────────────────
function fr2RenderFiltres() {
  const sel = document.getElementById('frmFiltreAnnee');
  if (sel) {
    const annees = [...new Set(fr2Liste().map(f => String(f.dateDebut || '').slice(0, 4)).filter(Boolean))].sort().reverse();
    const cur = sel.value;
    sel.innerHTML = '<option value="">Toutes les années</option>' +
      annees.map(a => `<option value="${escAttr(a)}"${cur === a ? ' selected' : ''}>${escHtml(a)}</option>`).join('');
  }
  const dom = document.getElementById('frmFiltreDomaine');
  if (dom && !dom.options.length) {
    dom.innerHTML = '<option value="">Tous les domaines</option>' +
      (typeof FORMATION_DOMAINES !== 'undefined' ? FORMATION_DOMAINES : [])
        .map(d => `<option value="${escAttr(d)}">${escHtml(d)}</option>`).join('');
  }

  const chips = document.getElementById('fr2Chips');
  if (!chips) return;
  const annee = fr2Annee();
  const base = fr2Liste().filter(f => !annee || String(f.dateDebut || '').startsWith(annee));
  const compte = {};
  base.forEach(f => { const c = fr2Cat(f); compte[c] = (compte[c] || 0) + 1; });
  const defs = [{ id: 'all', label: 'Toutes', dot: '#818cf8', n: base.length }]
    .concat(Object.keys(FR2_CAT).map(k => ({ id: k, label: FR2_CAT[k].l, dot: FR2_CAT[k].c, n: compte[k] || 0 })));
  chips.innerHTML = defs.map(d => `<button type="button" class="v2-chip-f${FR2_FILTRE === d.id ? ' on' : ''}" onclick="fr2SetFiltre('${d.id}')">
      <span class="dot" style="background:${d.dot}"></span>${escHtml(d.label)}<span class="n">${d.n}</span>
    </button>`).join('');
}

// ── Rendu : tableau des formations ───────────────────────────────────────
function fr2LigneActions(f, isAdmin) {
  if (isAdmin) {
    let h = '';
    if (f.statut !== 'realisee') {
      h += `<button type="button" class="fr2-btn ico" title="Modifier" onclick="event.stopPropagation();openFormationModal('${escAttr(f.id)}')">${fr2Svg(FR2_IC.pen)}</button>`;
      if (f.statut !== 'annulee') {
        h += `<button type="button" class="fr2-btn ok" title="Marquer comme réalisée" onclick="event.stopPropagation();frmSetStatut('${escAttr(f.id)}','realisee')">${fr2Svg(FR2_IC.check)}<span class="fr2-btn-l">Réalisée</span></button>`;
      }
    } else {
      h += `<button type="button" class="fr2-btn" title="Repasser en planifiée" onclick="event.stopPropagation();frmSetStatut('${escAttr(f.id)}','planifiee')">${fr2Svg(FR2_IC.undo)}<span class="fr2-btn-l">Rouvrir</span></button>`;
    }
    return h;
  }
  // Salarié : inscription / désinscription (logique identique à js/formations.js)
  if (f.statut !== 'planifiee') return '';
  const parts = f.participants || [];
  const dateRef = f.dateFin || f.dateDebut;
  if (dateRef && dateRef < fr2Today()) return `<span class="fr2-mut">Terminée</span>`;
  const empId = frmCurrentEmployeId();
  const dedans = empId && parts.some(p => String(p) === String(empId));
  if (dedans) return `<button type="button" class="fr2-btn ok" title="Se désinscrire" onclick="event.stopPropagation();frmDesinscrire('${escAttr(f.id)}')">${fr2Svg(FR2_IC.check)}<span class="fr2-btn-l">Inscrit</span></button>`;
  if (f.maxParticipants && parts.length >= f.maxParticipants) return `<span class="fr2-mut">Complet</span>`;
  return `<button type="button" class="fr2-btn pri" onclick="event.stopPropagation();frmInscrire('${escAttr(f.id)}')">S'inscrire</button>`;
}

function fr2RenderTable() {
  const el = document.getElementById('frmList');
  if (!el) return;
  const isAdmin = fr2IsAdmin();
  const list = fr2Filtrees();
  if (!list.length) {
    el.innerHTML = `<div style="padding:34px 20px;text-align:center;font-size:12.5px;color:var(--v2-t7)">Aucune formation ne correspond à ce filtre.</div>`;
    return;
  }
  const cols = ['Formation', 'Catégorie', 'Dates', 'Participants', 'Statut', ''];
  const corps = list.map(f => {
    const cat = fr2Cat(f), cc = FR2_CAT[cat].c, st = fr2Statut(f);
    const parts = (f.participants || []).length;
    const cap = f.maxParticipants ? `${parts}/${f.maxParticipants}` : `${parts}`;
    const editable = isAdmin && f.statut !== 'realisee';
    const meta = [fr2Dates(f), `${cap} inscrit${parts > 1 ? 's' : ''}`, FR2_CAT[cat].l].join(' · ');
    return `<tr class="${editable ? 'clic ' : ''}${f.statut === 'annulee' ? 'off' : ''}"${editable ? ` onclick="openFormationModal('${escAttr(f.id)}')"` : ''}>
      <td>
        <div class="fr2-f" style="--pc:${cc}">
          <span class="fr2-f-ico">${fr2Svg(FR2_CAT_ICO[cat])}</span>
          <div class="fr2-f-txt">
            <div class="fr2-f-t">${escHtml(f.titre || '')}</div>
            <div class="fr2-f-s">${f.organisme ? escHtml(f.organisme) : '<span class="fr2-dash">Organisme non renseigné</span>'}</div>
            <div class="fr2-f-m">${escHtml(meta)}</div>
          </div>
        </div>
      </td>
      <td class="opt"><span class="fr2-pill" style="--pc:${cc}">${escHtml(FR2_CAT[cat].l)}</span></td>
      <td class="opt"><span class="fr2-dates">${escHtml(fr2Dates(f))}</span></td>
      <td class="opt"><span class="fr2-parts">${escHtml(cap)} inscrit${parts > 1 ? 's' : ''}</span></td>
      <td><span class="fr2-st" style="--pc:${st.c}"><span class="dot"></span>${escHtml(st.l)}</span></td>
      <td><div class="fr2-acts">${fr2LigneActions(f, isAdmin)}</div></td>
    </tr>`;
  }).join('');

  el.innerHTML = `<div class="fr2-tw"><table class="v2-table fr2-table">
      <thead><tr>${cols.map((c, i) => `<th class="${i >= 1 && i <= 3 ? 'opt' : ''}">${escHtml(c)}</th>`).join('')}</tr></thead>
      <tbody>${corps}</tbody>
    </table></div>`;
}

// ── Rendu : formations obligatoires à renouveler ─────────────────────────
function fr2ObligEcheance(o) {
  if (o.echeance) return o.echeance;
  if (o.derniere_date && o.periodicite_mois) return fr2AddMois(o.derniere_date, o.periodicite_mois);
  return '';
}
function fr2ObligTag(o) {
  const ech = fr2ObligEcheance(o);
  const j = fr2Jours(ech);
  if (j === null) return { l: 'À planifier', c: '#f59e0b' };
  if (j < 0) return { l: 'Échue', c: '#ef4444' };
  if (j <= 30) return { l: `< ${j} j`, c: '#ef4444' };
  if (j <= 90) return { l: `${j} j`, c: '#f59e0b' };
  return { l: formatDate(ech), c: '#10b981' };
}
function fr2RenderOblig() {
  const el = document.getElementById('fr2Oblig');
  if (!el) return;
  const admin = fr2IsAdmin();
  const head = `<div class="fr2-h" style="--pc:#fca5a5">
      <span class="fr2-h-ico">${fr2Svg(FR2_IC.shield)}</span>
      <span class="fr2-oblig-t">Formations obligatoires à renouveler</span>
      ${admin ? `<button type="button" class="fr2-btn fr2-h-add" onclick="fr2OpenForm('oblig')">${fr2Svg(FR2_IC.plus)}Ajouter</button>` : ''}
    </div>`;

  if (FR2_MISS.has(FR2_T_OBLIG)) {
    el.innerHTML = head + `<div class="v2-blk-vide">Suivi indisponible.</div>
      <div class="fr2-warn">La table <code>${FR2_T_OBLIG}</code> n'existe pas encore : exécutez <code>${escHtml(FR2_SQL)}</code> pour activer le suivi des obligations réglementaires.</div>`;
    return;
  }
  if (!FR2_OBLIG.length) {
    el.innerHTML = head + `<div class="v2-blk-vide">Aucune obligation enregistrée.</div>`;
    return;
  }
  const rows = FR2_OBLIG.slice().sort((a, b) => {
    const ja = fr2Jours(fr2ObligEcheance(a)), jb = fr2Jours(fr2ObligEcheance(b));
    return (ja === null ? 9e9 : ja) - (jb === null ? 9e9 : jb);
  }).map(o => {
    const tag = fr2ObligTag(o);
    const c = fr2Color(o.libelle);
    const det = [o.detail, o.derniere_date ? 'Dernière : ' + formatDate(o.derniere_date) : ''].filter(Boolean).join(' · ');
    return `<div class="fr2-i" style="--pc:${c}">
      <span class="fr2-i-ico">${fr2Svg(FR2_IC.alert)}</span>
      <div class="fr2-i-x">
        <div class="fr2-i-t">${escHtml(o.libelle || '')}</div>
        <div class="fr2-i-s">${det ? escHtml(det) : '<span class="fr2-dash">Aucun détail</span>'}</div>
      </div>
      <span class="fr2-pill" style="--pc:${tag.c}">${escHtml(tag.l)}</span>
      ${admin ? `<button type="button" class="fr2-btn ico" title="Modifier" onclick="fr2OpenForm('oblig','${escAttr(o.id)}')">${fr2Svg(FR2_IC.pen)}</button>` : ''}
    </div>`;
  }).join('');
  el.innerHTML = head + rows;
}

// ── Rendu : rail budget ──────────────────────────────────────────────────
function fr2RenderBudget() {
  const el = document.getElementById('fr2Budget');
  if (!el) return;
  if (!fr2IsRH()) { el.style.display = 'none'; return; }
  el.style.display = '';

  const annee = fr2AnneeRef();
  const admin = fr2IsAdmin();
  const engage = fr2Liste()
    .filter(f => String(f.dateDebut || '').startsWith(annee) && f.statut !== 'annulee')
    .reduce((a, f) => a + (Number(f.cout) || 0), 0);
  const b = FR2_BUDGETS.find(x => String(x.annee) === annee);
  const head = `<div class="fr2-h">
      <span class="fr2-budget-t">Budget formation ${escHtml(annee)}</span>
      ${admin ? `<button type="button" class="fr2-btn fr2-h-add" onclick="fr2OpenForm('budget','${b ? escAttr(b.id) : ''}')">${fr2Svg(b ? FR2_IC.pen : FR2_IC.plus)}${b ? 'Modifier' : 'Enveloppe'}</button>` : ''}
    </div>`;

  if (FR2_MISS.has(FR2_T_BUDGET)) {
    el.innerHTML = head + `<div class="fr2-budget-n">${escHtml(fr2Eur0(engage))}</div>
      <div class="fr2-budget-s">engagé sur l'année ${escHtml(annee)}</div>
      <div class="fr2-warn">Enveloppe indisponible : la table <code>${FR2_T_BUDGET}</code> n'existe pas encore (voir <code>${escHtml(FR2_SQL)}</code>).</div>`;
    return;
  }
  if (!b || !(Number(b.enveloppe) > 0)) {
    el.innerHTML = head + `<div class="fr2-budget-n">${escHtml(fr2Eur0(engage))}</div>
      <div class="fr2-budget-s">engagé sur l'année ${escHtml(annee)} — aucune enveloppe définie</div>`;
    return;
  }
  const env = Number(b.enveloppe);
  const masse = Number(b.masse_salariale) || 0;
  const pct = Math.min(100, Math.round(engage / env * 100));
  const reste = env - engage;
  const partMasse = masse > 0 ? ` (${(env / masse * 100).toFixed(1).replace('.', ',')} % masse salariale)` : '';
  el.innerHTML = head +
    `<div class="fr2-budget-n">${escHtml(fr2Eur0(engage))}</div>
     <div class="fr2-budget-s">engagé sur ${escHtml(fr2Eur0(env))}${escHtml(partMasse)}</div>
     <div class="v2-prog"><span style="width:${pct}%;background:linear-gradient(90deg,#16a34a,#4ade80)"></span></div>
     <div class="fr2-budget-f">${reste >= 0 ? 'Reste ' + escHtml(fr2Eur0(reste)) + ' disponibles' : 'Dépassement de ' + escHtml(fr2Eur0(-reste))}</div>`;
}

// ── Rendu : heures par catégorie ─────────────────────────────────────────
function fr2RenderCats() {
  const el = document.getElementById('fr2Cats');
  if (!el) return;
  const list = fr2Filtrees();
  const h = {};
  list.forEach(f => { if (f.statut === 'annulee') return; const c = fr2Cat(f); h[c] = (h[c] || 0) + (Number(f.dureeHeures) || 0); });
  const keys = Object.keys(FR2_CAT).filter(k => h[k]);
  const max = Math.max(1, ...keys.map(k => h[k]));
  const corps = keys.length
    ? keys.sort((a, b) => h[b] - h[a]).map(k => `<div class="fr2-cat">
        <div class="fr2-cat-h"><span class="fr2-cat-l">${escHtml(FR2_CAT[k].l)}</span><span class="fr2-cat-n">${escHtml((Math.round(h[k] * 10) / 10).toLocaleString('fr-FR'))} h</span></div>
        <div class="v2-prog v2-bar-sm"><span style="width:${Math.round(h[k] / max * 100)}%;background:${FR2_CAT[k].c}"></span></div>
      </div>`).join('')
    : `<div class="v2-blk-vide">Aucune durée renseignée sur ces formations.</div>`;
  el.innerHTML = `<div class="fr2-h"><span class="v2-blk-t">Par catégorie (heures)</span></div>` + corps;
}

// ── Rendu : prochaines sessions ──────────────────────────────────────────
function fr2RenderSessions() {
  const el = document.getElementById('fr2Sessions');
  if (!el) return;
  const t = fr2Today();
  const prochaines = fr2Liste()
    .filter(f => f.statut !== 'annulee' && f.dateDebut && f.dateDebut >= t)
    .sort((a, b) => String(a.dateDebut).localeCompare(String(b.dateDebut)))
    .slice(0, 4);
  const corps = prochaines.length
    ? prochaines.map(f => {
        const p = fr2Pastille(f.dateDebut);
        const n = (f.participants || []).length;
        const info = [f.organisme, `${n} inscrit${n > 1 ? 's' : ''}`].filter(Boolean).join(' · ');
        return `<div class="fr2-sess">
          <div class="fr2-sess-d"><div class="fr2-sess-j">${escHtml(p.j)}</div><div class="fr2-sess-m">${escHtml(p.m)}</div></div>
          <div class="fr2-sess-x"><div class="fr2-sess-t">${escHtml(f.titre || '')}</div><div class="fr2-sess-s">${escHtml(info)}</div></div>
        </div>`;
      }).join('')
    : `<div class="v2-blk-vide">Aucune session à venir.</div>`;
  el.innerHTML = `<div class="fr2-h" style="--pc:#22d3ee">
      <span class="fr2-h-ico">${fr2Svg(FR2_IC.cal)}</span><span class="v2-blk-t">Prochaines sessions</span>
    </div>` + corps;
}

// ── Rendu : plan de développement des compétences ────────────────────────
function fr2RenderPlan() {
  const el = document.getElementById('fr2Plan');
  if (!el) return;
  if (!fr2IsRH()) { el.style.display = 'none'; return; }
  el.style.display = '';
  const admin = fr2IsAdmin();
  const annee = fr2AnneeRef();
  const rows = FR2_PARC.filter(p => !p.annee || String(p.annee) === annee);
  const suivis = new Set(rows.map(p => String(p.employe_id)));
  const total = fr2EmpActifs().length;
  const head = `<div class="fr2-h" style="--pc:#4ade80">
      <span class="fr2-h-ico">${fr2Svg(FR2_IC.grad)}</span>
      <span class="v2-blk-t">Plan de développement des compétences ${escHtml(annee)}</span>
      ${!FR2_MISS.has(FR2_T_PARC) && total ? `<span class="fr2-pill fr2-h-add" style="--pc:#4ade80">${suivis.size} / ${total} salariés</span>` : ''}
      ${admin ? `<button type="button" class="fr2-btn${!FR2_MISS.has(FR2_T_PARC) && total ? '' : ' fr2-h-add'}" onclick="fr2OpenForm('parcours')">${fr2Svg(FR2_IC.plus)}Parcours</button>` : ''}
    </div>`;
  if (FR2_MISS.has(FR2_T_PARC)) {
    el.innerHTML = head + `<div class="v2-blk-vide">Suivi indisponible.</div>
      <div class="fr2-warn">La table <code>${FR2_T_PARC}</code> n'existe pas encore : exécutez <code>${escHtml(FR2_SQL)}</code>.</div>`;
    return;
  }
  if (!rows.length) { el.innerHTML = head + `<div class="v2-blk-vide">Aucun parcours enregistré pour ${escHtml(annee)}.</div>`; return; }
  el.innerHTML = head + rows.slice().sort((a, b) => (Number(b.progression) || 0) - (Number(a.progression) || 0)).map(p => {
    const nom = fr2EmpNom(p.employe_id);
    const c = fr2Color(nom || p.id);
    const pct = Math.max(0, Math.min(100, Number(p.progression) || 0));
    return `<div class="fr2-p" style="--pc:${c}">
      <span class="fr2-av">${escHtml(fr2Ini(nom) )}</span>
      <div class="fr2-p-x">
        <div class="fr2-p-n">${nom ? escHtml(nom) : '<span class="fr2-dash">Salarié inconnu</span>'}</div>
        <div class="fr2-p-s">${escHtml(p.intitule || '')}</div>
      </div>
      <span class="fr2-p-bar v2-prog v2-bar-sm"><span style="width:${pct}%;background:${c}"></span></span>
      <span class="fr2-p-pct">${pct} %</span>
      ${admin ? `<button type="button" class="fr2-btn ico fr2-p-ed" title="Modifier" onclick="fr2OpenForm('parcours','${escAttr(p.id)}')">${fr2Svg(FR2_IC.pen)}</button>` : ''}
    </div>`;
  }).join('');
}

// ── Rendu : compteurs CPF ────────────────────────────────────────────────
function fr2RenderCpf() {
  const el = document.getElementById('fr2Cpf');
  if (!el) return;
  if (!fr2IsRH()) { el.style.display = 'none'; return; }
  el.style.display = '';
  const admin = fr2IsAdmin();
  const head = `<div class="fr2-h" style="--pc:#22d3ee">
      <span class="fr2-h-ico">${fr2Svg(FR2_IC.card)}</span><span class="fr2-cpf-t">Compteurs CPF</span>
      ${admin ? `<button type="button" class="fr2-btn fr2-h-add" onclick="fr2OpenForm('cpf')">${fr2Svg(FR2_IC.plus)}Saisir</button>` : ''}
    </div>`;
  if (FR2_MISS.has(FR2_T_CPF)) {
    el.innerHTML = head + `<div class="v2-blk-vide">Compteurs indisponibles.</div>
      <div class="fr2-warn">La table <code>${FR2_T_CPF}</code> n'existe pas encore : exécutez <code>${escHtml(FR2_SQL)}</code>.</div>`;
    return;
  }
  if (!FR2_CPF.length) { el.innerHTML = head + `<div class="v2-blk-vide">Aucun solde CPF renseigné.</div>`; return; }
  const corps = FR2_CPF.slice().sort((a, b) => (Number(b.solde) || 0) - (Number(a.solde) || 0)).map(c => {
    const nom = fr2EmpNom(c.employe_id);
    const col = fr2Color(nom || c.id);
    return `<div class="fr2-c" style="--pc:${col}">
      <span class="fr2-av" style="width:28px;height:28px;font-size:9px">${escHtml(fr2Ini(nom))}</span>
      <span class="fr2-c-n">${nom ? escHtml(nom) : '<span class="fr2-dash">Salarié inconnu</span>'}</span>
      <span class="fr2-c-v">${escHtml(fr2Eur0(c.solde))}</span>
      ${admin ? `<button type="button" class="fr2-btn ico" title="Modifier" onclick="fr2OpenForm('cpf','${escAttr(c.id)}')">${fr2Svg(FR2_IC.pen)}</button>` : ''}
    </div>`;
  }).join('');
  el.innerHTML = head + corps + `<div class="fr2-cpf-f">Abondement employeur possible sur projet co-construit.</div>`;
}

// ── Rendu : évaluations ──────────────────────────────────────────────────
function fr2RenderEvals() {
  const el = document.getElementById('fr2Evals');
  if (!el) return;
  const head = `<div class="fr2-h" style="--pc:#fbbf24">
      <span class="fr2-h-ico">${fr2Svg(FR2_IC.star)}</span><span class="v2-blk-t">Évaluations</span>
    </div>`;
  if (FR2_MISS.has(FR2_T_EVAL)) {
    el.innerHTML = head + `<div class="v2-blk-vide">Retours non disponibles.</div>
      <div class="fr2-warn">La table <code>${FR2_T_EVAL}</code> n'existe pas encore : exécutez <code>${escHtml(FR2_SQL_EVAL)}</code> (module « Mes formations »).</div>`;
    return;
  }
  const par = new Map();
  FR2_EVALS.forEach(e => {
    const k = String(e.formation_id);
    if (!par.has(k)) par.set(k, []);
    par.get(k).push(e);
  });
  if (!par.size) { el.innerHTML = head + `<div class="v2-blk-vide">Aucun retour de stagiaire pour l'instant.</div>`; return; }
  const lignes = [...par.entries()].map(([id, evs]) => {
    const f = fr2Liste().find(x => String(x.id) === id);
    const notes = evs.map(e => Number(e.note)).filter(n => n > 0);
    const moy = notes.length ? (notes.reduce((a, n) => a + n, 0) / notes.length) : null;
    const chaud = Math.round(evs.filter(e => (e.chaud || '').trim()).length / evs.length * 100);
    const froid = Math.round(evs.filter(e => (e.froid || '').trim()).length / evs.length * 100);
    return { titre: (f && f.titre) || 'Formation supprimée', n: evs.length, moy, chaud, froid };
  }).sort((a, b) => b.n - a.n).slice(0, 5);
  el.innerHTML = head + lignes.map(l => `<div class="fr2-e">
      <div class="fr2-e-h">
        <span class="fr2-e-t">${escHtml(l.titre)}</span>
        <span class="fr2-e-n">${l.moy !== null ? escHtml(l.moy.toFixed(1).replace('.', ',')) + '/5' : '<span class="fr2-dash">non noté</span>'}</span>
      </div>
      <div class="fr2-e-m"><span>À chaud ${l.chaud} %</span><span>À froid ${l.froid} %</span><span>${l.n} retour${l.n > 1 ? 's' : ''}</span></div>
    </div>`).join('');
}

// ── Rendu : attestations & certifications ────────────────────────────────
function fr2RenderAtt() {
  const el = document.getElementById('fr2Attest');
  if (!el) return;
  if (!fr2IsRH()) { el.style.display = 'none'; return; }
  el.style.display = '';
  const admin = fr2IsAdmin();
  const head = `<div class="fr2-h" style="--pc:#a78bfa">
      <span class="fr2-h-ico">${fr2Svg(FR2_IC.award)}</span><span class="v2-blk-t">Attestations &amp; certifications</span>
      ${admin ? `<button type="button" class="fr2-btn fr2-h-add" onclick="fr2OpenForm('attestation')">${fr2Svg(FR2_IC.plus)}Ajouter</button>` : ''}
    </div>`;
  if (FR2_MISS.has(FR2_T_ATT)) {
    el.innerHTML = head + `<div class="v2-blk-vide">Archivage indisponible.</div>
      <div class="fr2-warn">La table <code>${FR2_T_ATT}</code> n'existe pas encore : exécutez <code>${escHtml(FR2_SQL)}</code>.</div>`;
    return;
  }
  if (!FR2_ATT.length) { el.innerHTML = head + `<div class="v2-blk-vide">Aucune attestation archivée.</div>`; return; }
  el.innerHTML = head + FR2_ATT.slice().reverse().map(a => {
    const nom = fr2EmpNom(a.employe_id);
    const c = fr2Color(a.titre || a.id);
    const sous = [nom, a.delivre_le ? formatDate(a.delivre_le) : ''].filter(Boolean).join(' · ');
    return `<div class="fr2-a" style="--pc:${c}">
      <span class="fr2-a-ico">${fr2Svg(FR2_IC.file)}</span>
      <div class="fr2-a-x">
        <div class="fr2-a-t">${escHtml(a.titre || '')}</div>
        <div class="fr2-a-s">${sous ? escHtml(sous) : '<span class="fr2-dash">Bénéficiaire non précisé</span>'}</div>
      </div>
      ${a.fichier_path ? `<button type="button" class="fr2-a-dl" title="Télécharger" onclick="fr2Telecharger('${escAttr(a.fichier_path)}')">${fr2Svg(FR2_IC.dl)}</button>` : ''}
      ${admin ? `<button type="button" class="fr2-a-dl" title="Supprimer" onclick="fr2SupprimerAtt('${escAttr(a.id)}')">${fr2Svg(FR2_IC.trash)}</button>` : ''}
    </div>`;
  }).join('');
}

async function fr2Telecharger(path) {
  try {
    const { data, error } = await supabaseClient.storage.from('justificatifs').createSignedUrl(path, 120);
    if (error) throw error;
    if (data && data.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
  } catch (e) { console.error('[fr2Telecharger]', e); toast('Fichier indisponible', 'error'); }
}
function fr2SupprimerAtt(id) {
  confirmDialog('Supprimer cette attestation ?', async () => {
    const a = FR2_ATT.find(x => String(x.id) === String(id));
    if (await fr2Delete(FR2_T_ATT, id)) {
      if (a && a.fichier_path) { try { await supabaseClient.storage.from('justificatifs').remove([a.fichier_path]); } catch (e) { console.warn(e); } }
      FR2_ATT = FR2_ATT.filter(x => String(x.id) !== String(id));
      toast('Attestation supprimée', 'info');
      fr2Render();
    }
  });
}

// ── Rendu : organismes partenaires ───────────────────────────────────────
function fr2RenderOrgs() {
  const el = document.getElementById('fr2Orgs');
  if (!el) return;
  const admin = fr2IsAdmin();
  const head = `<div class="fr2-h">
      <span class="v2-blk-t">Organismes partenaires</span>
      ${admin ? `<button type="button" class="fr2-btn fr2-h-add" onclick="fr2OpenForm('organisme')">${fr2Svg(FR2_IC.plus)}Ajouter</button>` : ''}
    </div>`;
  if (FR2_MISS.has(FR2_T_ORG)) {
    el.innerHTML = head + `<div class="v2-blk-vide">Répertoire indisponible.</div>
      <div class="fr2-warn">La table <code>${FR2_T_ORG}</code> n'existe pas encore : exécutez <code>${escHtml(FR2_SQL)}</code>.</div>`;
    return;
  }
  if (!FR2_ORG.length) { el.innerHTML = head + `<div class="v2-blk-vide">Aucun organisme enregistré.</div>`; return; }
  el.innerHTML = head + FR2_ORG.map(o => {
    const c = fr2Color(o.nom || o.id);
    return `<div class="fr2-o" style="--pc:${c}">
      <span class="fr2-o-av">${escHtml(fr2Ini(o.nom))}</span>
      <div class="fr2-o-x">
        <div class="fr2-o-n">${escHtml(o.nom || '')}</div>
        <div class="fr2-o-s">${o.specialite ? escHtml(o.specialite) : '<span class="fr2-dash">Spécialité non précisée</span>'}</div>
      </div>
      <span class="fr2-o-q${o.qualiopi ? '' : ' non'}">${o.qualiopi ? 'Qualiopi' : 'Non certifié'}</span>
      ${admin ? `<button type="button" class="fr2-btn ico" title="Modifier" onclick="fr2OpenForm('organisme','${escAttr(o.id)}')">${fr2Svg(FR2_IC.pen)}</button>` : ''}
    </div>`;
  }).join('');
}

// ── Modale générique des blocs RH (gabarit .v2-ov / .v2-md) ──────────────
function fr2ChampEmploye(id, val) {
  const opts = fr2EmpActifs().map(e => `<option value="${escAttr(e.id)}"${String(val) === String(e.id) ? ' selected' : ''}>${escHtml(e.prenom + ' ' + e.nom)}</option>`).join('');
  return `<select id="${id}" class="v2-fld"><option value="">— Choisir un salarié —</option>${opts}</select>`;
}

const FR2_FORMS = {
  budget: {
    titre: 'Enveloppe de formation', sous: 'Budget annuel du plan de formation', mc: '#16a34a', ico: FR2_IC.euro,
    table: FR2_T_BUDGET,
    corps: r => `
      <div><label class="v2-fld-l" for="fr2fAnnee">Année *</label><input type="number" id="fr2fAnnee" class="v2-fld" value="${escAttr(r ? r.annee : fr2AnneeRef())}"/></div>
      <div class="v2-grid2">
        <div><label class="v2-fld-l" for="fr2fEnv">Enveloppe (€) *</label><input type="number" id="fr2fEnv" class="v2-fld" min="0" step="0.01" value="${escAttr(r ? r.enveloppe : '')}"/></div>
        <div><label class="v2-fld-l" for="fr2fMasse">Masse salariale (€)</label><input type="number" id="fr2fMasse" class="v2-fld" min="0" step="0.01" value="${escAttr(r && r.masse_salariale != null ? r.masse_salariale : '')}"/></div>
      </div>
      <div class="v2-note v2-note-ok">${fr2Svg(FR2_IC.check)}Le montant engagé est calculé à partir du coût des formations non annulées.</div>`,
    lire: () => {
      const annee = parseInt(document.getElementById('fr2fAnnee').value, 10);
      const env = parseFloat(document.getElementById('fr2fEnv').value);
      if (!annee) { toast('Année requise', 'error'); return null; }
      if (!(env >= 0)) { toast('Enveloppe requise', 'error'); return null; }
      const masse = parseFloat(document.getElementById('fr2fMasse').value);
      return { annee, enveloppe: env, masse_salariale: isNaN(masse) ? null : masse };
    }
  },
  oblig: {
    titre: 'Obligation de formation', sous: 'Recyclage réglementaire à suivre', mc: '#ef4444', ico: FR2_IC.shield,
    table: FR2_T_OBLIG,
    corps: r => `
      <div><label class="v2-fld-l" for="fr2fLib">Intitulé *</label><input type="text" id="fr2fLib" class="v2-fld" placeholder="Ex : SST — recyclage 24 mois" value="${escAttr(r ? r.libelle : '')}"/></div>
      <div><label class="v2-fld-l" for="fr2fDet">Détail</label><input type="text" id="fr2fDet" class="v2-fld" placeholder="Ex : 3 salariés arrivent à échéance" value="${escAttr(r && r.detail || '')}"/></div>
      <div class="v2-grid2">
        <div><label class="v2-fld-l" for="fr2fDern">Dernière session</label><input type="date" id="fr2fDern" class="v2-fld" value="${escAttr(r && r.derniere_date || '')}"/></div>
        <div><label class="v2-fld-l" for="fr2fPer">Périodicité (mois)</label><input type="number" id="fr2fPer" class="v2-fld" min="1" placeholder="24" value="${escAttr(r && r.periodicite_mois || '')}"/></div>
      </div>
      <div><label class="v2-fld-l" for="fr2fEch">Échéance (si connue)</label><input type="date" id="fr2fEch" class="v2-fld" value="${escAttr(r && r.echeance || '')}"/></div>
      <div class="v2-note v2-note-warn">${fr2Svg(FR2_IC.alert)}Sans échéance ni périodicité, l'obligation est affichée « À planifier ».</div>`,
    lire: () => {
      const libelle = document.getElementById('fr2fLib').value.trim();
      if (!libelle) { toast('Intitulé requis', 'error'); return null; }
      const per = parseInt(document.getElementById('fr2fPer').value, 10);
      return {
        libelle,
        detail: document.getElementById('fr2fDet').value.trim(),
        derniere_date: document.getElementById('fr2fDern').value || null,
        periodicite_mois: isNaN(per) ? null : per,
        echeance: document.getElementById('fr2fEch').value || null
      };
    }
  },
  parcours: {
    titre: 'Parcours de compétences', sous: 'Plan de développement du salarié', mc: '#4ade80', ico: FR2_IC.grad,
    table: FR2_T_PARC,
    corps: r => `
      <div><label class="v2-fld-l" for="fr2fEmp">Salarié *</label>${fr2ChampEmploye('fr2fEmp', r && r.employe_id)}</div>
      <div><label class="v2-fld-l" for="fr2fInt">Parcours visé *</label><input type="text" id="fr2fInt" class="v2-fld" placeholder="Ex : VAE éducateur spécialisé" value="${escAttr(r && r.intitule || '')}"/></div>
      <div class="v2-grid2">
        <div><label class="v2-fld-l" for="fr2fProg">Progression (%)</label><input type="number" id="fr2fProg" class="v2-fld" min="0" max="100" value="${escAttr(r && r.progression != null ? r.progression : 0)}"/></div>
        <div><label class="v2-fld-l" for="fr2fAn">Année</label><input type="number" id="fr2fAn" class="v2-fld" value="${escAttr(r && r.annee || fr2AnneeRef())}"/></div>
      </div>`,
    lire: () => {
      const employe_id = document.getElementById('fr2fEmp').value;
      const intitule = document.getElementById('fr2fInt').value.trim();
      if (!employe_id) { toast('Salarié requis', 'error'); return null; }
      if (!intitule) { toast('Parcours requis', 'error'); return null; }
      const an = parseInt(document.getElementById('fr2fAn').value, 10);
      return {
        employe_id, intitule,
        progression: Math.max(0, Math.min(100, parseInt(document.getElementById('fr2fProg').value, 10) || 0)),
        annee: isNaN(an) ? null : an
      };
    }
  },
  cpf: {
    titre: 'Compteur CPF', sous: 'Solde déclaré par le salarié', mc: '#22d3ee', ico: FR2_IC.card,
    table: FR2_T_CPF,
    corps: r => `
      <div><label class="v2-fld-l" for="fr2fEmp">Salarié *</label>${fr2ChampEmploye('fr2fEmp', r && r.employe_id)}</div>
      <div class="v2-grid2">
        <div><label class="v2-fld-l" for="fr2fSolde">Solde (€) *</label><input type="number" id="fr2fSolde" class="v2-fld" min="0" step="0.01" value="${escAttr(r && r.solde != null ? r.solde : '')}"/></div>
        <div><label class="v2-fld-l" for="fr2fMaj">Relevé du</label><input type="date" id="fr2fMaj" class="v2-fld" value="${escAttr(r && r.maj_le || fr2Today())}"/></div>
      </div>
      <div class="v2-note v2-note-warn">${fr2Svg(FR2_IC.alert)}Donnée personnelle : visible du seul encadrement, jamais des autres salariés.</div>`,
    lire: () => {
      const employe_id = document.getElementById('fr2fEmp').value;
      const solde = parseFloat(document.getElementById('fr2fSolde').value);
      if (!employe_id) { toast('Salarié requis', 'error'); return null; }
      if (!(solde >= 0)) { toast('Solde requis', 'error'); return null; }
      return { employe_id, solde, maj_le: document.getElementById('fr2fMaj').value || null };
    }
  },
  attestation: {
    titre: 'Attestation / certification', sous: 'Pièce archivée au dossier du salarié', mc: '#a78bfa', ico: FR2_IC.award,
    table: FR2_T_ATT,
    corps: r => `
      <div><label class="v2-fld-l" for="fr2fTit">Intitulé *</label><input type="text" id="fr2fTit" class="v2-fld" placeholder="Ex : Attestation SST" value="${escAttr(r && r.titre || '')}"/></div>
      <div><label class="v2-fld-l" for="fr2fEmp">Salarié</label>${fr2ChampEmploye('fr2fEmp', r && r.employe_id)}</div>
      <div class="v2-grid2">
        <div><label class="v2-fld-l" for="fr2fDel">Délivrée le</label><input type="date" id="fr2fDel" class="v2-fld" value="${escAttr(r && r.delivre_le || fr2Today())}"/></div>
        <div><label class="v2-fld-l" for="fr2fFic">Fichier (PDF, image)</label><input type="file" id="fr2fFic" class="v2-fld" accept="application/pdf,image/*"/></div>
      </div>`,
    lire: () => {
      const titre = document.getElementById('fr2fTit').value.trim();
      if (!titre) { toast('Intitulé requis', 'error'); return null; }
      return {
        titre,
        employe_id: document.getElementById('fr2fEmp').value || null,
        delivre_le: document.getElementById('fr2fDel').value || null
      };
    },
    fichier: true
  },
  organisme: {
    titre: 'Organisme partenaire', sous: 'Prestataire de formation', mc: '#818cf8', ico: FR2_IC.book,
    table: FR2_T_ORG,
    corps: r => `
      <div><label class="v2-fld-l" for="fr2fNom">Nom *</label><input type="text" id="fr2fNom" class="v2-fld" placeholder="Ex : Croix-Rouge" value="${escAttr(r && r.nom || '')}"/></div>
      <div><label class="v2-fld-l" for="fr2fSpe">Spécialité</label><input type="text" id="fr2fSpe" class="v2-fld" placeholder="Ex : SST, secourisme" value="${escAttr(r && r.specialite || '')}"/></div>
      <div class="v2-grid2">
        <div><label class="v2-fld-l" for="fr2fContact">Contact</label><input type="text" id="fr2fContact" class="v2-fld" placeholder="Téléphone ou courriel" value="${escAttr(r && r.contact || '')}"/></div>
        <div><label class="v2-fld-l" for="fr2fQual">Certification Qualiopi</label>
          <select id="fr2fQual" class="v2-fld"><option value="1"${!r || r.qualiopi ? ' selected' : ''}>Qualiopi</option><option value="0"${r && !r.qualiopi ? ' selected' : ''}>Non certifié</option></select></div>
      </div>`,
    lire: () => {
      const nom = document.getElementById('fr2fNom').value.trim();
      if (!nom) { toast('Nom requis', 'error'); return null; }
      return {
        nom,
        specialite: document.getElementById('fr2fSpe').value.trim(),
        contact: document.getElementById('fr2fContact').value.trim(),
        qualiopi: document.getElementById('fr2fQual').value === '1'
      };
    }
  }
};

function fr2Rows(kind) {
  return { budget: FR2_BUDGETS, oblig: FR2_OBLIG, parcours: FR2_PARC, cpf: FR2_CPF, attestation: FR2_ATT, organisme: FR2_ORG }[kind] || [];
}

function fr2OpenForm(kind, id) {
  const def = FR2_FORMS[kind];
  if (!def) return;
  if (!fr2IsAdmin()) { toast('Action réservée aux administrateurs', 'error'); return; }
  if (fr2RefuseSiAbsente(def.table)) return;
  const row = id ? fr2Rows(kind).find(r => String(r.id) === String(id)) : null;
  FR2_FORM = { kind, id: row ? row.id : null };
  const el = document.getElementById('fr2Modal');
  if (!el) return;
  el.innerHTML = `<div class="v2-md" style="--mc:${def.mc}" role="dialog" aria-modal="true" aria-label="${escAttr(def.titre)}">
    <div class="v2-md-h">
      <span class="v2-md-ico">${fr2Svg(def.ico)}</span>
      <div><div class="v2-md-t">${escHtml(def.titre)}</div><div class="v2-md-s">${escHtml(def.sous)}</div></div>
      <button type="button" class="v2-md-x" onclick="closeModal('fr2Modal')" aria-label="Fermer">${fr2Svg(FR2_IC.x)}</button>
    </div>
    <div class="v2-md-b">${def.corps(row)}</div>
    <div class="v2-md-f">
      ${row ? `<button type="button" class="v2-btn-sec" onclick="fr2SupprimerForm()">Supprimer</button>` : ''}
      <button type="button" class="v2-btn-sec" onclick="closeModal('fr2Modal')">Annuler</button>
      <button type="button" class="v2-btn-pri" onclick="fr2SaveForm()">${fr2Svg(FR2_IC.check)}Enregistrer</button>
    </div>
  </div>`;
  openModal('fr2Modal');
}

async function fr2SaveForm() {
  const def = FR2_FORMS[FR2_FORM.kind];
  if (!def) return;
  const row = def.lire();
  if (!row) return;
  if (def.fichier) {
    const inp = document.getElementById('fr2fFic');
    const file = inp && inp.files && inp.files[0];
    if (file) {
      const uid = await fr2AuthUid();   // 1er segment imposé par la RLS du bucket
      if (!uid) { toast('Session Supabase introuvable', 'error'); return; }
      try {
        const safe = (file.name || 'fichier').replace(/[^\w.\-]+/g, '_');
        const path = `${uid}/formations/${Date.now()}_${safe}`;
        const { error } = await supabaseClient.storage.from('justificatifs')
          .upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (error) throw error;
        row.fichier_path = path;
      } catch (e) { console.error('[fr2 upload]', e); toast('Envoi du fichier impossible', 'error'); return; }
    }
  }
  const saved = await fr2Upsert(def.table, row, FR2_FORM.id);
  if (!saved) return;
  const list = fr2Rows(FR2_FORM.kind);
  const i = list.findIndex(r => String(r.id) === String(saved.id));
  if (i >= 0) list[i] = saved; else list.push(saved);
  if (typeof auditLog === 'function') auditLog('formation_rh_' + FR2_FORM.kind, saved.libelle || saved.titre || saved.nom || saved.intitule || String(saved.annee || ''));
  toast('Enregistré');
  closeModal('fr2Modal');
  fr2Render();
}

function fr2SupprimerForm() {
  const def = FR2_FORMS[FR2_FORM.kind];
  const id = FR2_FORM.id;
  if (!def || !id) return;
  confirmDialog('Supprimer cet élément ?', async () => {
    if (!await fr2Delete(def.table, id)) return;
    const list = fr2Rows(FR2_FORM.kind);
    const i = list.findIndex(r => String(r.id) === String(id));
    if (i >= 0) list.splice(i, 1);
    toast('Supprimé', 'info');
    closeModal('fr2Modal');
    fr2Render();
  });
}

// ── Rendu global ─────────────────────────────────────────────────────────
function fr2Render() {
  if (!document.getElementById('fr2Stats')) return;   // page vidée (accès refusé)
  fr2RenderFiltres();
  fr2RenderStats();
  fr2RenderTable();
  fr2RenderOblig();
  fr2RenderBudget();
  fr2RenderCats();
  fr2RenderSessions();
  fr2RenderPlan();
  fr2RenderCpf();
  fr2RenderEvals();
  fr2RenderAtt();
  fr2RenderOrgs();
}

// ── Branchements ─────────────────────────────────────────────────────────
// L'ancien rendu délègue au module V2 : tous les appelants existants
// (saveFormation, frmInscrire, frmSetStatut, changement d'année…) marchent.
window.renderFormations = function () { fr2Render(); };

// L'en-tête interactif de la modale « formation » vise désormais le gabarit V2.
window.frmModalSync = function () {
  const sub = document.querySelector('#modalFormation .v2-md-s');
  if (sub) {
    const titre = (document.getElementById('frmFormTitre') || {}).value || '';
    const dom = (document.getElementById('frmFormDomaine') || {}).value || '';
    sub.textContent = titre.trim() || dom || 'Formation professionnelle';
  }
  const md = document.querySelector('#modalFormation .v2-md');
  if (md) {
    const st = (document.getElementById('frmFormStatut') || {}).value || 'planifiee';
    const cols = { planifiee: '#22d3ee', realisee: '#10b981', annulee: '#8095b4' };
    md.style.setProperty('--mc', cols[st] || '#16a34a');
  }
};

async function fr2Init() {
  if (!document.getElementById('fr2Stats')) return;
  await fr2LoadExtras();
  fr2Render();
}
document.addEventListener('DOMContentLoaded', fr2Init);
if (typeof registerPageInit === 'function') registerPageInit('formations-v2', fr2Init);

// Constantes exposées explicitement : un `const` de premier niveau ne crée pas
// de propriété sur window (lecture depuis une iframe ou un onclick externe).
window.FR2_CAT = FR2_CAT;
window.FR2_SQL = FR2_SQL;
window.fr2Render = fr2Render;
window.fr2SetFiltre = fr2SetFiltre;
window.fr2OpenForm = fr2OpenForm;
window.fr2SaveForm = fr2SaveForm;
window.fr2SupprimerForm = fr2SupprimerForm;
window.fr2Telecharger = fr2Telecharger;
window.fr2SupprimerAtt = fr2SupprimerAtt;
