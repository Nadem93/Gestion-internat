// ── PLAN DE SOINS — DESIGN V2 ──
// Reproduit la maquette « Plan de soins (vie quotidienne) » :
// 4 tuiles de statistiques, rangée de puces de catégories, grille de soins en
// deux colonnes, puis « Objectifs de soins » + « Réévaluations à prévoir ».
//
// Les données, les filtres et les actions restent ceux de js/plan-soins.js
// (getPs, _psCoches, togglePsFait, togglePsActif, deletePs, openPsModal…).

// Palette et icônes de la maquette, par catégorie de l'application.
const PS2_CATS = {
  hygiene:      { c: '#22d3ee', ic: 'shower' },
  medication:   { c: '#dc2626', ic: 'pill' },
  mobilite:     { c: '#f59e0b', ic: 'wheel' },
  alimentation: { c: '#ea580c', ic: 'meal' },
  soins_infirm: { c: '#ef4444', ic: 'stetho' },
  psy:          { c: '#8b5cf6', ic: 'brain' },
  social:       { c: '#10b981', ic: 'hands' },
  autre:        { c: '#64748b', ic: 'list' }
};

// Libellés courts + couleurs de fréquence (maquette : « Hebdo », « Si besoin »…)
const PS2_FREQS = {
  quotidien: { l: 'Quotidien', c: '#10b981' },
  matin:     { l: 'Matin',     c: '#f59e0b' },
  midi:      { l: 'Midi',      c: '#fb923c' },
  soir:      { l: 'Soir',      c: '#818cf8' },
  nuit:      { l: 'Nuit',      c: '#6366f1' },
  semaine:   { l: 'Hebdo',     c: '#22d3ee' },
  mensuel:   { l: 'Mensuel',   c: '#a78bfa' },
  si_besoin: { l: 'Si besoin', c: '#64748b' }
};

const PS2_IC = {
  shower: '<path d="M4 4v16"/><circle cx="14" cy="6" r="3"/><path d="M14 9v2"/><path d="M8 14h.01M12 14h.01M16 14h.01M10 18h.01M14 18h.01"/>',
  wheel:  '<circle cx="17" cy="18" r="3"/><path d="M11 18H5.5a3.5 3.5 0 1 1 3-5"/><circle cx="8" cy="6" r="2"/><path d="M8 8v4l3 3"/>',
  meal:   '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/>',
  stetho: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 12 0V4a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
  brain:  '<path d="M12 5a3 3 0 1 0-5.9.7A3 3 0 0 0 4 11a3 3 0 0 0 2 5 3 3 0 0 0 6 0V5z"/><path d="M12 5a3 3 0 1 1 5.9.7A3 3 0 0 1 20 11a3 3 0 0 1-2 5 3 3 0 0 1-6 0"/>',
  hands:  '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>',
  pill:   '<path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7z"/><path d="m8.5 8.5 7 7"/>',
  list:   '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>',
  check:  '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  users:  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  care:   '<path d="M9 12h6m-3-3v6"/><circle cx="12" cy="12" r="10"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  cal:    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'
};
function ps2Svg(d, w) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 2}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

const PS2_MOIS = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];

let PS2_PPE = [];       // avenants (dates de révision du projet) — chargés en différé
let PS2_OBJ_CAT = null; // catalogue d'objectifs (app_config) — chargé en différé

function ps2Cat(id)  { return PS2_CATS[id] || PS2_CATS.autre; }
function ps2Freq(id) { return PS2_FREQS[id] || PS2_FREQS.quotidien; }
function ps2Ini(nom) {
  return (String(nom || '').trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('') || '?').toUpperCase();
}
function ps2ResList() { return (typeof sbResidents === 'function') ? sbResidents() : []; }
function ps2Res(rid, residents) { return (residents || []).find(r => String(r.id) === String(rid)); }
function ps2ResNom(r) { return r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : 'Général'; }
function ps2ResCourt(r) {
  if (!r) return 'Général';
  const p = (r.prenom || '').trim(), n = (r.nom || '').trim();
  return p ? `${p[0]}. ${n}`.trim() : (n || 'Général');
}
function ps2ResColor(r) {
  return (typeof safeColor === 'function') ? safeColor(r && r.color, '#818cf8') : ((r && r.color) || '#818cf8');
}

// ── RENDU PRINCIPAL ──────────────────────────────────────────────────

function ps2Render() {
  const residents  = ps2ResList();
  const filterCat  = document.getElementById('psFilterCat')?.value || '';

  let base = getPs();
  if (_psResidentId) base = base.filter(p => String(p.residentId) === String(_psResidentId));
  const list = filterCat ? base.filter(p => p.cat === filterCat) : base;

  ps2Stats(list);
  ps2Chips(base, filterCat);
  ps2DateBar();
  ps2Cards(list, residents);
  ps2Bottom(list, residents);
}

// ── Tuiles de statistiques ───────────────────────────────────────────

function ps2Stats(list) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('psStatTotal',     list.length);
  set('psStatActifs',    list.filter(p => p.actif !== false).length);
  set('psStatResidents', new Set(list.map(p => p.residentId).filter(Boolean)).size);
  set('psStatCats',      new Set(list.map(p => p.cat || 'autre')).size);
}

// ── Puces de filtre par catégorie ────────────────────────────────────

function ps2Chips(base, filterCat) {
  const box = document.getElementById('psChips');
  if (!box) return;
  const counts = {};
  base.forEach(s => { const k = s.cat || 'autre'; counts[k] = (counts[k] || 0) + 1; });

  const chip = (id, label, dot, n) =>
    `<button type="button" class="v2-chip-f${filterCat === id ? ' on' : ''}" onclick="ps2SetCat('${id}')">
       <span class="dot" style="background:${dot}"></span>${escHtml(label)}${n != null ? ` <span class="n">${n}</span>` : ''}
     </button>`;

  // Toutes les catégories sont proposées (comme dans la maquette), avec le
  // nombre de soins concernés pour le périmètre courant.
  box.innerHTML = chip('', 'Toutes', '#818cf8', base.length)
    + PS_CATS.map(c => chip(c.id, c.label, ps2Cat(c.id).c, counts[c.id] || 0)).join('');
}

function ps2SetCat(id) {
  const sel = document.getElementById('psFilterCat');
  if (sel) sel.value = id;
  ps2Render();
}

// ── Barre de date (checklist du jour / historique) ───────────────────

function ps2DateBar() {
  const bar = document.getElementById('psDateBar');
  if (!bar) return;
  const t = _psToday();
  const isToday = _psDate === t;
  const lbl = new Date((_psDate || t) + 'T12:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  bar.className = 'ps2-datebar';
  bar.innerHTML = `
    <button type="button" class="ps2-dnav" onclick="psSetDate(-1)" aria-label="Jour précédent" title="Jour précédent">
      ${ps2Svg('<polyline points="15 18 9 12 15 6"/>', 2.2)}
    </button>
    <button type="button" class="ps2-dnav" onclick="psSetDate(1)" aria-label="Jour suivant" title="Jour suivant"${isToday ? ' disabled' : ''}>
      ${ps2Svg('<polyline points="9 18 15 12 9 6"/>', 2.2)}
    </button>
    <span class="ps2-dlbl">${escHtml(lbl)}</span>
    ${isToday ? '' : `<button type="button" class="ps2-dtoday" onclick="psGoToday()">Aujourd’hui</button>
      <span class="ps2-dhist">Historique — lecture seule</span>`}`;
}

// ── Grille des soins ─────────────────────────────────────────────────

function ps2Cards(list, residents) {
  const box = document.getElementById('psList');
  if (!box) return;
  box.className = 'ps2-grid';

  if (!list.length) {
    box.innerHTML = `<div class="ps2-empty">
      <p>${_psResidentId ? 'Aucun soin défini pour ce résident.' : 'Aucun soin dans le plan de soins.'}</p>
      <button type="button" class="ps2-new" onclick="openPsModal()">
        ${ps2Svg('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', 2.4)}Nouveau soin
      </button>
    </div>`;
    return;
  }

  // Actifs d'abord, puis dans l'ordre des moments de la journée.
  const fi = f => { const i = PS_FREQS.findIndex(x => x.id === f); return i < 0 ? 99 : i; };
  const sorted = list.slice().sort((a, b) =>
    ((a.actif !== false ? 0 : 1) - (b.actif !== false ? 0 : 1)) || (fi(a.freq) - fi(b.freq)));

  box.innerHTML = sorted.map(s => ps2Card(s, residents)).join('');
}

function ps2Card(s, residents) {
  const cat  = ps2Cat(s.cat);
  const catL = (PS_CATS.find(c => c.id === s.cat) || { label: 'Autre' }).label;
  const fr   = ps2Freq(s.freq);
  const r    = ps2Res(s.residentId, residents);
  const rc   = ps2ResColor(r);
  const actif = s.actif !== false;
  const coche = _psCoches[String(s.id)];
  const done  = actif && !!coche;
  const isTodayView = _psDate === _psToday();

  const faitBtn = !actif
    ? `<span class="dc-badge dc-b-gray"><span class="d"></span>Suspendu</span>`
    : isTodayView
      ? `<button type="button" class="ps2-fait${done ? ' on' : ''}" onclick="togglePsFait('${s.id}')"
           title="${done ? 'Fait — cliquer pour annuler' : 'Marquer comme fait'}"><span class="ck">${done ? '✓' : ''}</span>${done ? 'Fait' : 'Fait ?'}</button>`
      : `<span class="ps2-fait ro${done ? ' on' : ' off'}"><span class="ck">${done ? '✓' : ''}</span>${done ? 'Fait' : 'Non fait'}</span>`;

  return `<article class="ps2-card${actif ? '' : ' susp'}${done ? ' done' : ''}" style="--cc:${cat.c}">
    <div class="ps2-acts">
      <button type="button" onclick="openPsModal('${s.id}')" title="Modifier" aria-label="Modifier">✎</button>
      <button type="button" onclick="togglePsActif('${s.id}')" title="${actif ? 'Suspendre' : 'Réactiver'}" aria-label="${actif ? 'Suspendre' : 'Réactiver'}">${actif ? '⏸' : '▶'}</button>
      <button type="button" onclick="deletePs('${s.id}')" title="Supprimer" aria-label="Supprimer" style="color:var(--v2-danger-text)">✕</button>
    </div>
    <div class="ps2-card-h">
      <span class="ps2-card-ico">${ps2Svg(PS2_IC[cat.ic])}</span>
      <div style="flex:1;min-width:0">
        <div class="ps2-card-t">${escHtml(s.libelle || '—')}</div>
        <div class="dc-eyebrow" style="margin-top:4px">${escHtml(catL)}</div>
      </div>
      <span class="dc-badge" style="background:${fr.c}1f;color:${fr.c};border:1px solid ${fr.c}44"><span class="d" style="background:${fr.c}"></span>${escHtml(fr.l)}</span>
    </div>
    ${s.detail ? `<div class="ps2-card-d">${escHtml(s.detail)}</div>` : ''}
    <div class="ps2-card-f">
      <span class="ps2-res">
        <span class="ps2-res-av" style="background:${rc}">${escHtml(ps2Ini(ps2ResNom(r)))}</span>
        <span class="ps2-res-n">${escHtml(ps2ResCourt(r))}</span>
      </span>
      ${s.intervenant ? `<span class="ps2-interv">${escHtml(s.intervenant)}</span>` : '<span class="ps2-interv">Sans intervenant</span>'}
      ${faitBtn}
    </div>
    ${done ? `<div class="ps2-doneby">✓ Fait par ${escHtml(coche.par || '?')}${_psCocheTime(coche)}</div>` : ''}
  </article>`;
}

// ── Bas de page : objectifs de soins + réévaluations ─────────────────

function ps2Bottom(list, residents) {
  const box = document.getElementById('psBottom');
  if (!box) return;
  box.innerHTML = `
    <div class="dc-card">
      <div class="dc-head"><div class="dc-head-l">
        <span class="dc-chip" style="background:rgba(34,211,238,.16);color:#22d3ee">${ps2Svg(PS2_IC.target).replace('<svg', '<svg width="16" height="16"')}</span>
        <div style="min-width:0"><div class="dc-eyebrow">Suivi projet</div><div class="dc-title">Objectifs de soins</div></div>
      </div></div>
      <div class="dc-body">${ps2Objectifs(list, residents)}</div>
    </div>
    <div class="dc-card">
      <div class="dc-head"><div class="dc-head-l">
        <span class="dc-chip" style="background:rgba(245,158,11,.16);color:#fbbf24">${ps2Svg(PS2_IC.cal).replace('<svg', '<svg width="16" height="16"')}</span>
        <div style="min-width:0"><div class="dc-eyebrow">Échéances</div><div class="dc-title">Réévaluations à prévoir</div></div>
      </div></div>
      <div class="dc-body">${ps2Reeval(list, residents)}</div>
    </div>`;
}

// Un objectif n'a pas de pourcentage en base : il est calculé sur la
// progression de ses axes de travail (même règle que la fiche résident).
function ps2ObjPct(sv) {
  const axes = (sv && sv.axes) || [];
  if (axes.length) return Math.round(axes.reduce((a, x) => a + (Number(x.progression) || 0), 0) / axes.length);
  return sv && sv.statut === 'atteint' ? 100 : 0;
}
function ps2PctColor(p) {
  if (p >= 80) return '#10b981';
  if (p >= 50) return '#818cf8';
  if (p >= 25) return '#f59e0b';
  return '#ef4444';
}

function ps2Objectifs(list, residents) {
  const catalogue = PS2_OBJ_CAT
    || ((typeof DB !== 'undefined' && DB.get) ? (DB.get(DB.keys.objectives) || []) : []);
  const rids = [...new Set(list.map(s => s.residentId).filter(Boolean))];
  const out = [];
  rids.forEach(rid => {
    const r = ps2Res(rid, residents);
    if (!r) return;
    const suivi = r.objectifsSuivi || {};
    (r.objectifs || []).forEach(id => {
      const sv = suivi[id] || {};
      if (sv.statut === 'abandonne') return;
      const def = catalogue.find(o => String(o.id) === String(id)) || {};
      if (!def.name) return;                       // objectif inconnu du catalogue : on n'invente rien
      const pct = ps2ObjPct(sv);
      out.push({ res: r, label: `${ps2ResCourt(r)} — ${def.name}`, pct });
    });
  });
  if (!out.length) return '<div class="ps2-vide">Aucun objectif rattaché aux résidents affichés.</div>';

  out.sort((a, b) => b.pct - a.pct);
  return `<div class="ps2-objs">${out.slice(0, 6).map(o => {
    const c = ps2PctColor(o.pct);
    return `<div style="border-left:3px solid ${ps2ResColor(o.res)};padding-left:11px">
      <div class="ps2-obj-h">
        <span class="ps2-obj-av" style="background:${ps2ResColor(o.res)}">${escHtml(ps2Ini(ps2ResNom(o.res)))}</span>
        <span class="ps2-obj-l">${escHtml(o.label)}</span>
        <span class="ps2-obj-p" style="color:${c}">${o.pct}%</span>
      </div>
      <div class="al-prog-bar" style="height:6px"><span style="width:${o.pct}%;background:${c}"></span></div>
    </div>`;
  }).join('')}</div>`;
}

// Réévaluations = dates de révision des avenants (table ppe) des résidents affichés.
function ps2Reeval(list, residents) {
  const rids = new Set(list.map(s => String(s.residentId)).filter(Boolean));
  const today = new Date(_psToday() + 'T12:00:00');
  const items = (PS2_PPE || [])
    .filter(p => p.dateRevision && p.statut !== 'termine' && rids.has(String(p.residentId)))
    .map(p => {
      const d = new Date(p.dateRevision + 'T12:00:00');
      const j = Math.round((d - today) / 86400000);
      return { p, d, j, r: ps2Res(p.residentId, residents) };
    })
    .filter(x => !isNaN(x.d.getTime()))
    .sort((a, b) => a.d - b.d)
    .slice(0, 5);

  if (!items.length) return '<div class="ps2-vide">Aucune révision de projet planifiée pour ces résidents.</div>';

  return items.map(x => {
    const c = x.j < 0 ? '#ef4444' : x.j <= 7 ? '#f59e0b' : x.j <= 30 ? '#22d3ee' : '#818cf8';
    const lft = x.j < 0 ? 'En retard' : x.j === 0 ? "Aujourd'hui" : 'J-' + x.j;
    return `<div class="ps2-re" style="--pc:${c};border-left:3px solid ${c};padding-left:11px">
      <div class="ps2-re-d">
        <span class="ps2-re-j">${String(x.d.getDate()).padStart(2, '0')}</span>
        <span class="ps2-re-m">${PS2_MOIS[x.d.getMonth()]}</span>
      </div>
      <div style="flex:1;min-width:0">
        <div class="ps2-re-n">${escHtml(ps2ResCourt(x.r) || x.p.residentName || '—')}</div>
        <div class="ps2-re-w">Révision du projet personnalisé</div>
      </div>
      <span class="dc-badge" style="background:${c}1f;color:${c};border:1px solid ${c}44"><span class="d" style="background:${c}"></span>${lft}</span>
    </div>`;
  }).join('');
}

// ── Chargement différé des données du bas de page ────────────────────
// (avenants + catalogue d'objectifs : absents du chargement de plan-soins.js)
async function ps2LoadExtras() {
  // Lecture seule du catalogue d'objectifs (app_config) : pas d'amorçage ni
  // d'écriture depuis cette page.
  try {
    if (typeof sbGetAppConfig === 'function') {
      const cfg = await sbGetAppConfig();
      if (Array.isArray(cfg.objectives)) PS2_OBJ_CAT = cfg.objectives;
    }
  } catch (e) { console.error('[ps2LoadExtras] config', e); }
  try {
    if (typeof sbGetPpe === 'function') PS2_PPE = await sbGetPpe();
  } catch (e) { console.error('[ps2LoadExtras] ppe', e); PS2_PPE = []; }
  if (document.getElementById('psList')) ps2Render();
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(ps2LoadExtras, 0); });
