// ══════════════════════════════════════════════════════════════════════════
// DOSSIERS & SUIVI V2 — reproduction de la maquette
// « Dossiers & suivi - refonte (bento) » : navigation latérale groupée,
// bandeau de KPI, tuiles « Accès rapides », bloc « Échéances à venir » et
// bloc « Complétude des dossiers ».
//
// La liste des modules (DS_NAV), leurs droits (dsAllowed) et la navigation
// interne (loadPage / showHome) restent définis dans dossiers.html : ce
// fichier ne fait que le rendu. Aucune couche Supabase existante n'est
// réécrite, on appelle les fonctions sb* déjà chargées par la page.
//
// Seule exception : le référentiel des pièces requises du dossier
// (table dossier_pieces_requises, apportée par la maquette) n'avait aucune
// couche d'accès ; elle est écrite ici, avec dégradation douce tant que
// migration-dossiers.sql n'a pas été exécuté.
// ══════════════════════════════════════════════════════════════════════════

const DS2 = { data: null, loading: false, tuto: null };
const DOSSIERS_SQL_FILE = 'migration-dossiers.sql';

const _ds = s => (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s);
const _dsToday = () => (typeof today === 'function') ? today() : new Date().toISOString().slice(0, 10);
const _dsCall = async (fn, ...a) => {
  try { return (typeof window[fn] === 'function') ? await window[fn](...a) : null; }
  catch (e) { console.warn('[ds2]', fn, e); return null; }
};
// #rrggbb → rgba(...) pour les ombres colorées
function _dsRgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return `rgba(129,140,248,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const _dsSvg = (d, c, sz) => `<svg width="${sz || 20}" height="${sz || 20}" viewBox="0 0 24 24" fill="none" `
  + `stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
// minuscules sans accents — comparaison de libellés et de noms de fichiers
const _dsNorm = s => String(s == null ? '' : s).toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// Icônes de la maquette
const DS_IC = {
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  admis: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3 2 6"/><path d="m22 6-3-3"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  back: '<path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>'
};

const DS_MOIS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
const DS_AV_COLORS = ['#818cf8', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#a855f7', '#14b8a6'];
function _dsAvColor(id) {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return DS_AV_COLORS[h % DS_AV_COLORS.length];
}
function _dsAdmin() {
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  return !!s && ['admin', 'superadmin'].includes(s.role);
}

// ══════════════════════════════════════════════════════════════════════
// PIÈCES REQUISES DU DOSSIER — table dossier_pieces_requises
// Dégradation douce : tant que migration-dossiers.sql n'a pas été exécuté,
// la lecture renvoie [] avec un console.warn (la page reste utilisable) et
// l'écriture remonte une erreur nommant le fichier SQL.
// ══════════════════════════════════════════════════════════════════════

function _dsPieceFromRow(r) {
  return {
    id: r.id,
    libelle: r.libelle || '',
    categorie: r.categorie || '',
    motsCles: Array.isArray(r.mots_cles) ? r.mots_cles : [],
    ordre: r.ordre || 0,
    actif: r.actif !== false,
    createdBy: r.created_by || ''
  };
}
function _dsIsMissingTable(e) {
  const code = (e && e.code) || '';
  const msg = (e && e.message) || '';
  return code === '42P01' || code === 'PGRST205'
    || (/dossier_pieces_requises/i.test(msg) && /does not exist|schema cache/i.test(msg));
}
async function _dsAuthUid() {
  try {
    const { data } = await supabaseClient.auth.getUser();
    return (data && data.user && data.user.id) || null;
  } catch (e) { console.warn('[ds2] uid', e); return null; }
}

async function sbGetDossierPieces() {
  try {
    const { data, error } = await supabaseClient
      .from('dossier_pieces_requises').select('*')
      .order('ordre', { ascending: true });
    if (error) throw error;
    return (data || []).map(_dsPieceFromRow).filter(p => p.actif);
  } catch (e) {
    console.warn(`[ds2] pièces requises illisibles (${DOSSIERS_SQL_FILE} exécuté ?)`, e);
    return [];
  }
}

async function sbSaveDossierPiece(p) {
  const etablissementId = (typeof sbGetEtablissementId === 'function')
    ? await sbGetEtablissementId() : null;
  const row = {
    etablissement_id: etablissementId,
    libelle: p.libelle || '',
    categorie: p.categorie || '',
    mots_cles: p.motsCles || [],
    ordre: p.ordre || 0,
    actif: true,
    created_by: await _dsAuthUid()
  };
  const { data, error } = await supabaseClient
    .from('dossier_pieces_requises').insert(row).select();
  if (error) { const w = new Error(error.message); w.dsMissingTable = _dsIsMissingTable(error); throw w; }
  return _dsPieceFromRow(data[0]);
}

async function sbDeleteDossierPiece(id) {
  const { error } = await supabaseClient
    .from('dossier_pieces_requises').delete().eq('id', id);
  if (error) { const w = new Error(error.message); w.dsMissingTable = _dsIsMissingTable(error); throw w; }
}

function _dsPieceErr(e) {
  if (e && e.dsMissingTable) {
    toast(`Pièces requises indisponibles : exécutez ${DOSSIERS_SQL_FILE} dans Supabase`, 'error');
  } else {
    toast("Enregistrement impossible", 'error');
  }
  console.error('[ds2] pièces', e);
}

// ─── Entrée principale ────────────────────────────────────────────────────
function ds2Render() {
  const el = document.getElementById('dsWelcome');
  if (el) el.innerHTML = ds2Hello() + ds2Kpis() + ds2Cards() + ds2Bento();
  ds2Meta();
  if (!DS2.data && !DS2.loading) ds2Load();
}

// Chargement des données réelles, puis re-rendu des parties chiffrées
async function ds2Load() {
  DS2.loading = true;
  const [residents, admissions, echeances, incidents, ppe, docs,
    repertoire, satisfaction, cvs, soins, evals, pieces] = await Promise.all([
    _dsCall('sbGetResidents'),
    _dsCall('sbGetAdmissions'),
    _dsCall('sbGetEcheances'),
    _dsCall('sbGetIncidents'),
    _dsCall('sbGetPpe'),
    _dsCall('sbGetDocumentsResident'),
    _dsCall('sbGetRepertoire'),
    _dsCall('sbGetSatisfaction'),
    _dsCall('sbGetCvs'),
    _dsCall('sbGetPlanSoins'),
    _dsCall('sbGetEvaluations'),
    sbGetDossierPieces()
  ]);
  DS2.data = {
    residents: (residents || []).filter(r => r.statut !== 'sorti'),
    admissions: admissions || [],
    echeances: echeances || [],
    incidents: incidents || [],
    ppe: ppe || [],
    docs: docs || [],
    repertoire: repertoire || [],
    satisfaction: satisfaction || [],
    cvs: cvs || null,
    soins: (soins || []).filter(s => s.actif !== false),
    evals: evals || [],
    pieces: pieces || []
  };
  DS2.loading = false;
  const el = document.getElementById('dsWelcome');
  if (el) el.innerHTML = ds2Hello() + ds2Kpis() + ds2Cards() + ds2Bento();
  ds2Meta();
}

// ─── Chiffres dérivés des données réelles ─────────────────────────────────
function _dsPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function _dsJours(dateStr) {
  const t = new Date(_dsToday() + 'T00:00:00');
  const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
  return Math.round((d - t) / 86400000);
}
function _dsEchColor(j) {
  if (j <= 7) return '#ef4444';
  if (j <= 15) return '#f59e0b';
  if (j <= 30) return '#818cf8';
  return '#22d3ee';
}

function ds2Stats() {
  const D = DS2.data;
  if (!D) return null;
  const t = _dsToday();
  const mois = t.slice(0, 7);
  const dans30 = _dsPlus(30);

  const echAVenir = D.echeances
    .filter(e => !e.done && e.date && e.date >= t)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const eig = D.incidents.filter(i => i.eig && i.eig.declarable);

  return {
    dossiers: D.residents.length,
    admissionsEnCours: D.admissions.filter(a => ['en_attente', 'etude'].includes(a.statut)).length,
    echAVenir,
    ech30: echAVenir.filter(e => e.date <= dans30).length,
    eigMois: eig.filter(i => String(i.date || '').slice(0, 7) === mois).length,
    ppeARevoir: D.ppe.filter(p => p.dateRevision && p.dateRevision <= dans30).length,
    ppeTotal: D.ppe.length,
    docs: D.docs.length,
    evals: D.evals.length,
    soins: D.soins.length,
    contacts: D.repertoire.length,
    satisfaction: D.satisfaction.length,
    cvsMembres: ((D.cvs || {}).membres || []).length,
    completude: ds2Completude()
  };
}

// Complétude d'un dossier = part des pièces requises (référentiel
// dossier_pieces_requises) retrouvées parmi les documents du résident.
// Sans référentiel, on n'affiche rien : aucun pourcentage n'est inventé.
function ds2Completude() {
  const D = DS2.data;
  if (!D || !D.pieces.length) return [];
  const parRes = {};
  D.docs.forEach(d => {
    const k = String(d.residentId || '');
    (parRes[k] = parRes[k] || []).push(d);
  });
  return D.residents.map(r => {
    const docs = parRes[String(r.id)] || [];
    const manque = [];
    D.pieces.forEach(p => {
      const cat = _dsNorm(p.categorie);
      const mots = (p.motsCles || []).map(_dsNorm).filter(Boolean);
      const ok = docs.some(d => {
        if (cat && _dsNorm(d.category) === cat) return true;
        const n = _dsNorm(d.name) + ' ' + _dsNorm(d.fileName);
        return mots.some(m => n.includes(m));
      });
      if (!ok) manque.push(p.libelle);
    });
    const total = D.pieces.length;
    const pct = Math.round(((total - manque.length) / total) * 100);
    return {
      id: r.id,
      nom: `${(r.prenom || '').charAt(0)}${r.prenom ? '.' : ''} ${r.nom || ''}`.trim() || 'Résident',
      ini: (typeof initials === 'function') ? initials(r.prenom, r.nom) : '?',
      pct, manque
    };
  }).sort((a, b) => a.pct - b.pct || a.nom.localeCompare(b.nom, 'fr'));
}

// Bandeau de droite de la barre de titre : « n dossiers actifs »
function ds2Meta() {
  const el = document.getElementById('dsTopMeta');
  if (!el) return;
  const st = ds2Stats();
  el.textContent = st ? `${st.dossiers} dossier${st.dossiers > 1 ? 's' : ''} actif${st.dossiers > 1 ? 's' : ''}` : '';
}

// ─── Blocs de contenu ─────────────────────────────────────────────────────
function ds2Hello() {
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  const p = (s && (s.prenom || s.username) || '').trim();
  return `<div class="ds-hello">
    <h1>Bonjour${p ? ', ' + _ds(p) : ''}</h1>
    <div class="ds-hello-s">Le dossier du résident, de l'admission au suivi.</div>
  </div>`;
}

function ds2Kpis() {
  const st = ds2Stats();
  const v = x => st ? String(x) : '—';
  const K = [
    { n: v(st && st.dossiers), l: 'Dossiers actifs', c: '#818cf8', ic: DS_IC.folder },
    { n: v(st && st.admissionsEnCours), l: 'Admissions en cours', c: '#22d3ee', ic: DS_IC.admis },
    { n: v(st && st.ech30), l: 'Échéances < 30j', c: '#f59e0b', ic: DS_IC.clock },
    { n: v(st && st.eigMois), l: 'EIG ce mois', c: '#ef4444', ic: DS_IC.alert }
  ];
  return `<div class="ds-kpis">${K.map(k => `<div class="ds-kpi">
    <span class="ds-kpi-ic" style="background:${_dsRgba(k.c, .13)};color:${k.c}">${_dsSvg(k.ic, k.c, 21)}</span>
    <div><div class="ds-kpi-n" style="color:${k.c}">${_ds(k.n)}</div>
      <div class="ds-kpi-l">${k.l}</div></div></div>`).join('')}</div>`;
}

// Sous-titre de tuile : chiffre réel du module, jamais une valeur inventée.
function ds2CardSub(page) {
  const st = ds2Stats();
  if (!st) return '…';
  const p = (n, s, pl) => `${n} ${n > 1 ? (pl || (s + 's')) : s}`;
  switch (page) {
    case 'admissions.html': return `${st.admissionsEnCours} en cours`;
    case 'ppe.html': return st.ppeARevoir ? `${st.ppeARevoir} à réviser` : p(st.ppeTotal, 'avenant');
    case 'echeances.html': return `${st.echAVenir.length} à venir`;
    case 'documents.html': return p(st.docs, 'document');
    case 'objectifs.html': return p(st.evals, 'évaluation');
    case 'plan-soins.html': return p(st.soins, 'soin actif', 'soins actifs');
    case 'fiche-liaison.html': return 'Urgence hospitalisation';
    case 'cvs.html': return p(st.cvsMembres, 'membre');
    case 'satisfaction.html': return p(st.satisfaction, 'réponse');
    case 'eig.html': return `${st.eigMois} ce mois`;
    case 'repertoire.html': return p(st.contacts, 'contact');
    default: return '';
  }
}

function ds2Cards() {
  const nav = (window.DS_NAV || []).filter(window.dsAllowed || (() => true));
  const tuto = window.PORTAL_TUTO || {};
  return `<div class="ds-sec">Accès rapides</div>
    <div class="ds-cards">${nav.map(e => `
      <div class="ds-card" role="button" tabindex="0" data-page="${_ds(e.page)}" data-label="${_ds(e.label)}"
        aria-label="Ouvrir ${_ds(e.label)}" style="--dsc:${_ds(e.c1)};--dsc-sh:${_dsRgba(e.c1, .4)}">
        ${tuto[e.page] ? `<button type="button" class="ds-card-i" data-tuto="${_ds(e.page)}"
          title="Mode d'emploi — ${_ds(e.label)}" aria-label="Mode d'emploi — ${_ds(e.label)}">?</button>` : ''}
        <span class="ds-card-ic">${_dsSvg(e.icon, 'currentColor', 22)}</span>
        <div class="ds-card-l">${_ds(e.label)}</div>
        <div class="ds-card-s">${_ds(ds2CardSub(e.page))}</div>
      </div>`).join('')}</div>`;
}

function ds2Bento() {
  return `<div class="ds-bento">${ds2BlkEcheances()}${ds2BlkCompletude()}</div>`;
}

function ds2BlkEcheances() {
  const st = ds2Stats();
  let body = `<div class="ds-vide">Chargement…</div>`;
  if (st) {
    body = st.echAVenir.length
      ? st.echAVenir.slice(0, 5).map(e => {
        const j = _dsJours(e.date);
        const c = _dsEchColor(j);
        const d = new Date(String(e.date).slice(0, 10) + 'T00:00:00');
        const sous = [e.residentName, e.type && e.type !== 'autre' ? e.type : ''].filter(Boolean).join(' · ');
        return `<div class="ds-ech" style="--pc:${c}">
          <div class="ds-ech-d"><span class="ds-ech-j">${d.getDate()}</span>
            <span class="ds-ech-m">${DS_MOIS[d.getMonth()]}</span></div>
          <div class="ds-ech-b"><div class="ds-ech-t">${_ds(e.libelle || 'Échéance')}</div>
            <div class="ds-ech-s">${_ds(sous)}</div></div>
          <span class="ds-ech-l">${j === 0 ? "Aujourd'hui" : 'J-' + j}</span></div>`;
      }).join('')
      : `<div class="ds-vide">Aucune échéance à venir.</div>`;
  }
  return `<div class="ds-blk ds-blk-ech"><div class="ds-blk-h">${_dsSvg(DS_IC.clock, '#fbbf24', 15)}
    <span class="ds-blk-t">Échéances à venir</span>
    <button type="button" class="ds-blk-a" data-open="echeances.html" data-label="Échéancier">Voir tout</button>
    </div>${body}</div>`;
}

function ds2BlkCompletude() {
  const st = ds2Stats();
  const D = DS2.data;
  let body = `<div class="ds-vide">Chargement…</div>`;
  if (st) {
    if (!D.pieces.length) {
      body = `<div class="ds-vide">Aucune pièce requise n'est définie : la complétude ne peut pas être calculée.
        ${_dsAdmin() ? `Ajoutez les pièces attendues avec « Configurer » (nécessite l'exécution de ${DOSSIERS_SQL_FILE} dans Supabase).`
          : 'Un administrateur doit définir la liste des pièces attendues.'}</div>`;
    } else if (!st.completude.length) {
      body = `<div class="ds-vide">Aucun dossier actif.</div>`;
    } else {
      body = `<div class="ds-cpl">${st.completude.slice(0, 5).map(c => {
        const col = c.pct >= 90 ? '#10b981' : c.pct >= 70 ? '#f59e0b' : '#ef4444';
        const miss = c.manque.slice(0, 3).join(', ') + (c.manque.length > 3 ? `, +${c.manque.length - 3}` : '');
        return `<div>
          <div class="ds-cpl-h">
            <span class="ds-cpl-av" style="background:${_dsAvColor(c.id)}">${_ds(c.ini)}</span>
            <span class="ds-cpl-n">${_ds(c.nom)}</span>
            <span class="ds-cpl-p" style="color:${col}">${c.pct}%</span></div>
          <div class="v2-prog"><span style="width:${c.pct}%;background:${col}"></span></div>
          ${c.manque.length ? `<div class="ds-cpl-miss">Manque : ${_ds(miss)}</div>` : ''}
        </div>`;
      }).join('')}</div>`;
    }
  }
  return `<div class="ds-blk"><div class="ds-blk-h">${_dsSvg(DS_IC.check, '#22d3ee', 15)}
    <span class="ds-blk-t">Complétude des dossiers</span>
    ${_dsAdmin() ? `<button type="button" class="ds-blk-a" id="dsPiecesBtn" onclick="ds2OpenPieces()">
      ${_dsSvg(DS_IC.gear, 'currentColor', 13)} Configurer</button>` : ''}
    </div>${body}</div>`;
}

// ─── Configuration des pièces requises (modale, gabarit v2) ───────────────
function ds2OpenPieces() {
  ds2RenderPieces();
  const l = document.getElementById('dsPieceLib'); if (l) l.value = '';
  const c = document.getElementById('dsPieceCat'); if (c) c.value = '';
  const m = document.getElementById('dsPieceMots'); if (m) m.value = '';
  openModal('dsPiecesOv');
}
function ds2ClosePieces() { closeModal('dsPiecesOv'); }

function ds2RenderPieces() {
  const host = document.getElementById('dsPiecesList');
  if (!host) return;
  const pieces = (DS2.data && DS2.data.pieces) || [];
  host.innerHTML = pieces.length ? pieces.map(p => {
    const sous = [p.categorie ? `catégorie « ${p.categorie} »` : '',
      (p.motsCles || []).length ? `mots-clés : ${p.motsCles.join(', ')}` : ''].filter(Boolean).join(' · ');
    return `<div class="ds-pc">
      <div class="ds-pc-b"><div class="ds-pc-t">${_ds(p.libelle)}</div>
        ${sous ? `<div class="ds-pc-s">${_ds(sous)}</div>` : ''}</div>
      <button type="button" class="ds-pc-x" data-piece="${_ds(p.id)}" title="Retirer cette pièce"
        aria-label="Retirer ${_ds(p.libelle)}">${_dsSvg(DS_IC.x, 'currentColor', 14)}</button>
    </div>`;
  }).join('') : `<div class="ds-vide">Aucune pièce requise. Ajoutez-en une ci-dessous.</div>`;
}

async function ds2AddPiece() {
  const lib = (document.getElementById('dsPieceLib') || {}).value || '';
  const cat = (document.getElementById('dsPieceCat') || {}).value || '';
  const mots = (document.getElementById('dsPieceMots') || {}).value || '';
  if (!lib.trim()) { toast('Indiquez le libellé de la pièce', 'error'); return; }
  const btn = document.getElementById('dsPieceAdd');
  if (btn) btn.disabled = true;
  try {
    const p = await sbSaveDossierPiece({
      libelle: lib.trim(), categorie: cat.trim(),
      motsCles: mots.split(',').map(s => s.trim()).filter(Boolean),
      ordre: ((DS2.data && DS2.data.pieces.length) || 0) + 1
    });
    if (DS2.data) DS2.data.pieces.push(p);
    ds2RenderPieces();
    document.getElementById('dsPieceLib').value = '';
    document.getElementById('dsPieceCat').value = '';
    document.getElementById('dsPieceMots').value = '';
    toast('Pièce ajoutée au dossier type');
    ds2RefreshCompletude();
  } catch (e) { _dsPieceErr(e); }
  if (btn) btn.disabled = false;
}

async function ds2DeletePiece(id) {
  try {
    await sbDeleteDossierPiece(id);
    if (DS2.data) DS2.data.pieces = DS2.data.pieces.filter(p => String(p.id) !== String(id));
    ds2RenderPieces();
    toast('Pièce retirée');
    ds2RefreshCompletude();
  } catch (e) { _dsPieceErr(e); }
}

// Repeint le seul bloc de complétude (le reste de la page ne bouge pas)
function ds2RefreshCompletude() {
  const el = document.getElementById('dsWelcome');
  if (!el) return;
  const blocs = el.querySelectorAll('.ds-bento > .ds-blk');
  if (blocs.length < 2) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = ds2BlkCompletude();
  blocs[1].replaceWith(tmp.firstElementChild);
}

// ─── Mode d'emploi d'un module (gabarit de modale v2) ─────────────────────
// La maquette ne montre pas ces textes, mais ils existaient sur la page V1
// (composant PortalTuto) : on les conserve, accessibles depuis le « ? ».
function ds2OpenTuto(page) {
  const e = (window.DS_NAV || []).find(x => x.page === page);
  const t = (window.PORTAL_TUTO || {})[page];
  const ov = document.getElementById('dsTutoOv');
  if (!e || !t || !ov) return;
  const md = ov.querySelector('.v2-md');
  md.style.setProperty('--mc', e.c1);
  ov.querySelector('#dsTutoIco').innerHTML = _dsSvg(e.icon, 'currentColor', 22);
  ov.querySelector('#dsTutoT').textContent = e.label;
  ov.querySelector('#dsTutoS').textContent = e.g;
  ov.querySelector('#dsTutoB').innerHTML = `
    <div class="ds-tuto-p">${_ds(t.role || '')}</div>
    ${(t.mode && t.mode.length) ? `<div class="ds-tuto-box">
      <div class="ds-tuto-h"><span aria-hidden="true">🛠️</span> Mode d'emploi</div>
      <ol class="ds-tuto-ol">${t.mode.map(s => `<li>${_ds(s)}</li>`).join('')}</ol></div>` : ''}
    ${t.sync ? `<div class="ds-tuto-box"><div class="ds-tuto-h">🔗 Synchronisé avec</div>
      <div class="ds-tuto-p">${_ds(t.sync)}</div></div>` : ''}
    ${t.ex ? `<div class="ds-tuto-ex"><b>Exemple —</b> ${_ds(t.ex)}</div>` : ''}`;
  DS2.tuto = page;
  openModal('dsTutoOv');
}
function ds2CloseTuto() { closeModal('dsTutoOv'); DS2.tuto = null; }
function ds2OuvrirTuto() {
  const p = DS2.tuto;
  ds2CloseTuto();
  const e = (window.DS_NAV || []).find(x => x.page === p);
  if (e && typeof window.loadPage === 'function') window.loadPage(e.page, e.label);
}

// ─── Interactions ─────────────────────────────────────────────────────────
document.addEventListener('click', ev => {
  const info = ev.target.closest('.ds-card-i');
  if (info) { ev.stopPropagation(); ds2OpenTuto(info.dataset.tuto); return; }
  const del = ev.target.closest('.ds-pc-x');
  if (del) { ds2DeletePiece(del.dataset.piece); return; }
  const lien = ev.target.closest('.ds-blk-a[data-open]');
  if (lien && typeof window.loadPage === 'function') {
    window.loadPage(lien.dataset.open, lien.dataset.label);
    return;
  }
  const it = ev.target.closest('.ds-it, .ds-card');
  if (it && it.dataset.page && typeof window.loadPage === 'function') {
    window.loadPage(it.dataset.page, it.dataset.label);
  }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') {
    if (DS2.tuto) { ds2CloseTuto(); return; }
    const pv = document.getElementById('dsPiecesOv');
    if (pv && pv.classList.contains('open')) { ds2ClosePieces(); return; }
  }
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  const c = ev.target.closest && ev.target.closest('.ds-card');
  if (c && c.dataset.page && typeof window.loadPage === 'function') {
    ev.preventDefault();
    window.loadPage(c.dataset.page, c.dataset.label);
  }
});
