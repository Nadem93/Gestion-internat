// ── OBJECTIFS PERSONNALISÉS & AXES DE TRAVAIL ──
// Chaque objectif assigné au résident (r.objectifs, modèles gérés dans Admin) se décompose ici
// en axes de travail concrets, chacun avec sa progression 0-100 %.
// Stockage : r.objectifsSuivi[objId] = { statut, note, echeance, dateMaj,
//   axes:[{id, nom, progression, echeance, responsable, note, dateMaj, histo:[{d,p}]}] }
// → colonne jsonb objectifs_suivi de la table residents, déjà mappée : aucune migration nécessaire.

const OBJ_STATUTS = {
  non_commence: { label: 'Non commencé', cls: 'badge-gray', color: '#64748b' },
  en_cours: { label: 'En cours', cls: 'badge-amber', color: '#d97706' },
  atteint: { label: 'Atteint', cls: 'badge-green', color: '#16a34a' },
  abandonne: { label: 'Abandonné', cls: 'badge-red', color: '#dc2626' }
};
// Suggestions d'axes proposées à la création, selon le modèle d'objectif
const AXE_SUGGESTIONS = [
  { match: /autonomie/i, axes: ['Se lever et se préparer seul le matin', 'Préparer un repas simple en autonomie', 'Entretenir son linge', 'Se déplacer seul en ville'] },
  { match: /insertion|social/i, axes: ['Participer à une activité collective chaque semaine', 'Prendre la parole en groupe', 'Construire une relation avec un pair', 'S\'inscrire à une activité extérieure'] },
  { match: /sant/i, axes: ['Prendre son traitement sans rappel', 'Honorer ses rendez-vous médicaux', 'Améliorer son hygiène quotidienne', 'Pratiquer une activité physique régulière'] },
  { match: /scolar|formation|profession/i, axes: ['Être assidu aux cours / à la formation', 'Terminer un module de formation', 'Préparer un stage en milieu ordinaire', 'Organiser son travail personnel'] },
  { match: /famil/i, axes: ['Maintenir un contact régulier avec sa famille', 'Préparer sereinement les visites', 'Exprimer son vécu après les rencontres'] },
  { match: /logement|habitat/i, axes: ['Entretenir sa chambre / son espace', 'Gérer un budget logement', 'Découvrir les démarches d\'accès au logement', 'Expérimenter un séjour en studio d\'essai'] }
];
const AXE_SUGGESTIONS_DEFAUT = ['Étape 1 — découverte avec accompagnement', 'Étape 2 — mise en pratique accompagnée', 'Étape 3 — réalisation en autonomie'];

// Échelle de la grille d'évaluation d'un objectif (mêmes niveaux que les grilles
// d'autonomie de la fiche résident). Une note = niveau × 25 % de progression.
const EVAL_OBJ_NIVEAUX = [
  { v: 0, label: 'Non acquis', color: '#dc2626' },
  { v: 1, label: 'Aide importante', color: '#f97316' },
  { v: 2, label: 'Aide partielle', color: '#d97706' },
  { v: 3, label: 'Avec supervision', color: '#6366f1' },
  { v: 4, label: 'Autonome', color: '#16a34a' }
];
function axeSuggestions(tplObj) {
  const txt = `${tplObj?.name || ''} ${tplObj?.description || ''}`;
  const hit = AXE_SUGGESTIONS.find(s => s.match.test(txt));
  return hit ? hit.axes : AXE_SUGGESTIONS_DEFAUT;
}

let _obResidents = [];
let _obCanEdit = false;
let obAxeCtx = null; // { objId, axeId } pendant la création/édition d'un axe

// ── Données ──
let _residentsCache = [];
function residentsList() { return _residentsCache; }
async function loadResidentsCache() { _residentsCache = await sbGetResidents(); _obResidents = _residentsCache; }
async function persistResident(r) {
  const saved = await sbSaveResident(r);
  const i = _residentsCache.findIndex(x => String(x.id) === String(saved.id));
  if (i >= 0) _residentsCache[i] = saved; else _residentsCache.push(saved);
  _obResidents = _residentsCache;
  return saved;
}

function objTemplates() { return DB.get(DB.keys.objectives) || []; }
function residentsActifs() {
  return _obResidents.filter(r => r.statut !== 'sorti')
    .sort((a, b) => `${a.nom || ''}`.localeCompare(`${b.nom || ''}`, 'fr'));
}
function residentsAvecObjectifs() { return residentsActifs().filter(r => (r.objectifs || []).length); }
function getSuivi(r, objId) { return (r.objectifsSuivi || {})[objId] || {}; }
function axesOf(sv) { return Array.isArray(sv.axes) ? sv.axes : []; }
function resNom(r) { return `${r.prenom || ''} ${r.nom || ''}`.trim(); }

// % de l'objectif = moyenne des progressions de ses axes. Sans axe : 100 si atteint, sinon null (non mesurable).
function objPct(sv) {
  const axes = axesOf(sv);
  if (!axes.length) return sv.statut === 'atteint' ? 100 : null;
  return Math.round(axes.reduce((s, a) => s + clampPct(a.progression), 0) / axes.length);
}
function clampPct(v) { return Math.max(0, Math.min(100, +v || 0)); }
// Accent HUD = bleu ciel de la maquette (même teinte quel que soit l'avancement),
// vert uniquement quand l'étape est atteinte (100 %).
function pctColor(p) { return p >= 100 ? '#16a34a' : '#0ea5e9'; }
// escAttr est fourni globalement par js/app.js (chargé avant).

function echBadge(echeance, statut) {
  if (!echeance || statut === 'atteint') return '';
  const diff = Math.ceil((new Date(echeance) - new Date(today())) / 86400000);
  if (diff < 0) return ' <span class="badge badge-red">En retard</span>';
  if (diff <= 30) return ` <span class="badge badge-amber">J−${diff}</span>`;
  return '';
}

function currentResident() {
  const rid = document.getElementById('obResident').value;
  return rid ? _obResidents.find(r => String(r.id) === String(rid)) : null;
}

// ── Visuels façon HUD (hexagones, rangs, barres segmentées) ──
// Styles critiques inline (en plus des classes de la page) : le rendu reste correct
// même si le navigateur sert une version en cache de objectifs.html avec un JS plus récent.
const HEX_CLIP = 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)';
const HEX_STYLE = `clip-path:${HEX_CLIP};-webkit-clip-path:${HEX_CLIP}`;
const EYEBROW_STYLE = 'font-size:.6rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase';
const CHIP_STYLE = 'display:inline-flex;align-items:center;font-size:.62rem;font-weight:800;letter-spacing:.08em;padding:.22rem .55rem;border-radius:5px;border:1px solid;text-transform:uppercase;white-space:nowrap';
const STATUT_SEL_STYLE = 'width:auto;font-size:.66rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:.24rem .55rem;border-radius:5px;border:1.5px solid;background:#fff;cursor:pointer;font-family:inherit';
// Rang de maîtrise dérivé de la progression : D (0-24) → C → B → A → S (100)
function rangOf(p) { return p >= 100 ? 'S' : p >= 75 ? 'A' : p >= 50 ? 'B' : p >= 25 ? 'C' : 'D'; }
function rangLabel(p) {
  if (p == null) return 'RANG —';
  const r = rangOf(p);
  return r === 'S' ? 'RANG S ★' : `RANG ${r} → ${rangOf(p + 25)}`;
}

// Hexagone de progression (remplace l'anneau circulaire)
function hexSvg(pct, id, size) {
  const w = size || 80, h = Math.round(w * 1.12);
  const known = pct != null;
  const p = known ? clampPct(pct) : 0;
  const color = known ? pctColor(p) : '#cbd5e1';
  return `<div class="ob-hex" id="ring-${id}" role="img" aria-label="Progression ${known ? p + ' %' : 'non mesurée'}"
    style="${HEX_STYLE};width:${w}px;height:${h}px;background:conic-gradient(${color} 0 ${p * 3.6}deg,#e2e8f0 ${p * 3.6}deg 360deg);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .3s">
    <div class="ob-hex" style="${HEX_STYLE};width:${w - 10}px;height:${h - 10}px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <div id="ringtxt-${id}" style="font-size:${Math.round(w / 4.4)}px;font-weight:900;color:${known ? color : '#94a3b8'};font-variant-numeric:tabular-nums;line-height:1">${known ? p + '%' : '—'}</div>
      <div style="font-size:7px;font-weight:800;letter-spacing:.16em;color:#94a3b8;margin-top:2px">PROGRESSION</div>
    </div>
  </div>`;
}

// Mini-courbe d'évolution d'un axe (historique des progressions)
function sparkSvg(histo) {
  const h = (Array.isArray(histo) ? histo : []).slice(-20);
  if (h.length < 2) return '';
  const w = 62, ht = 20;
  const y = p => (ht - 3 - clampPct(p) / 100 * (ht - 6)).toFixed(1);
  const pts = h.map((e, i) => `${(i / (h.length - 1) * (w - 4) + 2).toFixed(1)},${y(e.p)}`).join(' ');
  const last = h[h.length - 1];
  return `<svg width="${w}" height="${ht}" viewBox="0 0 ${w} ${ht}" aria-hidden="true" style="flex-shrink:0">
    <polyline points="${pts}" fill="none" stroke="#38bdf8" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${w - 2}" cy="${y(last.p)}" r="2.2" fill="#0284c7"/></svg>`;
}

// ── RENDU PRINCIPAL ──
function renderObjectifs() {
  const rid = document.getElementById('obResident').value;
  const fStatut = document.getElementById('obFilterStatut').value;
  const tpl = objTemplates();
  const scope = rid
    ? _obResidents.filter(r => String(r.id) === String(rid))
    : residentsAvecObjectifs();

  // Stats sur le périmètre affiché
  let tot = 0, atteints = 0, axesTot = 0, pctSum = 0, pctN = 0;
  scope.forEach(r => (r.objectifs || []).forEach(id => {
    if (!tpl.find(t => String(t.id) === String(id))) return;
    const sv = getSuivi(r, id);
    tot++;
    if (sv.statut === 'atteint') atteints++;
    axesTot += axesOf(sv).length;
    const p = objPct(sv);
    if (p != null) { pctSum += p; pctN++; }
  }));
  document.getElementById('obStatObjectifs').textContent = tot;
  document.getElementById('obStatProgression').textContent = pctN ? Math.round(pctSum / pctN) + '%' : '—';
  document.getElementById('obStatAxes').textContent = axesTot;
  document.getElementById('obStatAtteints').textContent = atteints;

  const el = document.getElementById('obList');
  if (!rid) { el.innerHTML = renderOverview(scope, tpl); return; }

  const r = scope[0];
  if (!r) { el.innerHTML = emptyBox('Résident introuvable.'); return; }

  const resObjs = (r.objectifs || []).map(id => tpl.find(o => String(o.id) === String(id))).filter(Boolean);
  const barre = `<div style="display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-bottom:1rem;flex-wrap:wrap">
    <div style="font-size:.92rem;font-weight:800;color:var(--text)">${escHtml(resNom(r))} <span style="font-weight:500;color:var(--muted);font-size:.78rem">· ${resObjs.length} objectif${resObjs.length > 1 ? 's' : ''}</span></div>
    ${_obCanEdit ? `<button class="btn btn-accent btn-sm" onclick="openCatalogue()">⚙ Gérer les objectifs</button>` : ''}
  </div>`;

  if (!resObjs.length) {
    el.innerHTML = barre + emptyBox(`Aucun objectif n'est encore assigné à <strong>${escHtml(resNom(r))}</strong>.` +
      (_obCanEdit
        ? `<br><button class="btn btn-accent" style="margin-top:.8rem" onclick="openCatalogue()">+ Assigner des objectifs</button>`
        : `<br><span style="font-size:.78rem">Un membre de l'équipe éducative peut lui en assigner depuis cette page.</span>`));
    return;
  }
  const cards = resObjs
    .filter(o => !fStatut || (getSuivi(r, o.id).statut || 'non_commence') === fStatut)
    .map(o => objectifCard(r, o));
  el.innerHTML = barre + (cards.length ? cards.join('') : emptyBox('Aucun objectif ne correspond à ce filtre.'));
}

function emptyBox(html) {
  return `<div class="empty" style="padding:2.5rem"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div><p>${html}</p></div>`;
}

// Vue d'ensemble : un anneau global par résident, cliquable
function renderOverview(residents, tpl) {
  if (!residents.length) {
    return emptyBox(`Aucun résident n'a encore d'objectif assigné.<br>
      <span style="font-size:.78rem">Choisissez un résident dans la liste ci-dessus puis cliquez sur « Gérer les objectifs » pour commencer. Le guide 💡 ci-dessus explique le fonctionnement.</span>`);
  }
  const cards = residents.map(r => {
    const objs = (r.objectifs || []).map(id => tpl.find(o => String(o.id) === String(id))).filter(Boolean);
    if (!objs.length) return '';
    let pctSum = 0, pctN = 0, atteints = 0;
    const dots = objs.map(o => {
      const sv = getSuivi(r, o.id);
      const st = OBJ_STATUTS[sv.statut] || OBJ_STATUTS.non_commence;
      if (sv.statut === 'atteint') atteints++;
      const p = objPct(sv);
      if (p != null) { pctSum += p; pctN++; }
      return `<span class="ob-dot" title="${escAttr(o.name)} — ${st.label}${p != null ? ' (' + p + ' %)' : ''}" style="background:${st.color}"></span>`;
    }).join('');
    const global = pctN ? Math.round(pctSum / pctN) : null;
    return `<button class="ob-res-card" onclick="obSelectResident('${r.id}')" aria-label="Voir les objectifs de ${escAttr(resNom(r))}">
      ${hexSvg(global, 'res-' + r.id, 56)}
      <div class="ob-res-info">
        <div class="ob-eyebrow" style="${EYEBROW_STYLE};color:#94a3b8;font-size:.55rem">Résident · ${rangLabel(global)}</div>
        <div class="ob-res-nom">${escHtml(resNom(r))}</div>
        <div class="ob-res-meta">${objs.length} objectif${objs.length > 1 ? 's' : ''} · ${atteints} atteint${atteints > 1 ? 's' : ''}</div>
        <div class="ob-res-dots">${dots}</div>
      </div>
    </button>`;
  }).join('');
  return `<div style="font-size:.8rem;color:var(--muted);margin-bottom:.85rem">Cliquez sur un résident pour définir ses axes de travail et suivre sa progression.</div>
    <div class="ob-res-grid">${cards}</div>`;
}

function obSelectResident(id) {
  document.getElementById('obResident').value = String(id);
  renderObjectifs();
}

// Carte détaillée d'un objectif : anneau + statut + échéance + axes de travail + courbe
function objectifCard(r, o) {
  const sv = getSuivi(r, o.id);
  const st = OBJ_STATUTS[sv.statut] || OBJ_STATUTS.non_commence;
  const axes = axesOf(sv);
  const pct = objPct(sv);

  const statutUi = _obCanEdit
    ? `<select class="ob-statut-sel" onchange="setObjStatut('${o.id}', this.value)" aria-label="Statut de l'objectif ${escAttr(o.name)}" style="${STATUT_SEL_STYLE};border-color:${st.color};color:${st.color}">
        ${Object.entries(OBJ_STATUTS).map(([k, v]) => `<option value="${k}"${(sv.statut || 'non_commence') === k ? ' selected' : ''}>${v.label}</option>`).join('')}
      </select>`
    : `<span class="badge ${st.cls}">${st.label}</span>`;

  const ech = _obCanEdit
    ? `<label style="display:inline-flex;align-items:center;gap:.3rem;font-size:.7rem;color:var(--muted)">📅 Échéance
        <input type="date" value="${sv.echeance || ''}" onchange="setObjEcheance('${o.id}', this.value)" aria-label="Échéance de l'objectif ${escAttr(o.name)}" style="font-size:.72rem;padding:.12rem .3rem;border:1px solid var(--border);border-radius:6px;font-family:inherit;color:var(--g700)"/>
      </label>${echBadge(sv.echeance, sv.statut)}`
    : (sv.echeance ? `<span class="ob-axe-meta">📅 Échéance : ${formatDate(sv.echeance)}</span>${echBadge(sv.echeance, sv.statut)}` : '');

  const cta = _obCanEdit && pct === 100 && sv.statut !== 'atteint'
    ? `<button class="btn btn-sm" style="background:#16a34a;color:#fff;border:none" onclick="setObjStatut('${o.id}','atteint')">🎉 Tous les axes à 100 % — marquer atteint</button>`
    : '';

  const axesHtml = axes.length
    ? axes.map((a, i) => axeRow(o, a, i)).join('')
    : `<div style="font-size:.78rem;color:var(--muted);padding:.5rem .25rem">Aucun axe de travail défini. ${_obCanEdit ? 'Découpez cet objectif en étapes concrètes et mesurables — des suggestions vous seront proposées.' : ''}</div>`;

  return `<div class="card ob-card" style="border-left:4px solid ${st.color}">
    <div class="ob-card-head">
      ${hexSvg(pct, o.id, 78)}
      <div style="flex:1;min-width:0">
        <div class="ob-eyebrow" style="${EYEBROW_STYLE};color:#0284c7">Objectif personnalisé</div>
        <div class="ob-card-title">
          <span style="font-weight:900;font-size:1rem;letter-spacing:-.01em">${escHtml(o.name)}</span>
          ${statutUi}
          <span class="ob-chip" id="rang-${o.id}" style="${CHIP_STYLE};border-color:#bae6fd;background:#f0f9ff;color:#0284c7">${rangLabel(pct)}</span>
        </div>
        ${o.description ? `<div style="font-size:.78rem;color:var(--muted);margin-top:2px">${escHtml(o.description)}</div>` : ''}
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-top:.45rem">${ech}</div>
        ${sv.note ? `<div style="font-size:.78rem;color:var(--g700);margin-top:.35rem">📌 ${escHtml(sv.note)}</div>` : ''}
        ${sv.dateMaj ? `<div style="font-size:.7rem;color:var(--g400);margin-top:2px">Mis à jour le ${formatDate(sv.dateMaj)}</div>` : ''}
        ${cta ? `<div style="margin-top:.5rem">${cta}</div>` : ''}
      </div>
    </div>
    <div class="ob-axes">
      <div class="section-label" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem">
        <span>🧭 Axes de travail (${axes.length})</span>
        ${_obCanEdit ? `<button class="btn btn-ghost btn-sm" style="color:var(--accent)" onclick="openAxeModal('${o.id}')">+ Ajouter un axe</button>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:.55rem">${axesHtml}</div>
      ${evalsSection(o, sv, axes)}
    </div>
  </div>`;
}

// Section « Évaluations » de la carte : historique des grilles remplies pour cet objectif
function evalsSection(o, sv, axes) {
  const evals = getEvalsObj(sv).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (!axes.length && !evals.length) return '';
  return `
    <div class="section-label" style="display:flex;align-items:center;justify-content:space-between;margin:.9rem 0 .5rem">
      <span>📊 Évaluations (${evals.length})</span>
      ${_obCanEdit && axes.length ? `<button class="btn btn-ghost btn-sm" style="color:#0284c7" onclick="openEvalObjModal('${o.id}')">+ Évaluer</button>` : ''}
    </div>
    ${evals.length
      ? `<div style="display:flex;flex-direction:column;gap:.45rem">${evals.slice(0, 6).map((ev, i) => evalObjRow(o, ev, evals[i + 1], axes)).join('')}</div>`
      : `<div style="font-size:.75rem;color:var(--muted)">Aucune évaluation. « + Évaluer » ouvre une grille où chaque axe de travail est noté de 0 (non acquis) à 4 (autonome) — la progression se met à jour automatiquement.</div>`}`;
}

function axeRow(o, a, idx) {
  const p = clampPct(a.progression);
  const late = a.echeance && a.echeance < today() && p < 100;
  return `<div style="display:flex;align-items:stretch">
    <div style="display:flex;align-items:center;flex-shrink:0" aria-hidden="true">
      <div class="ob-hex" style="${HEX_STYLE};width:20px;height:23px;background:${pctColor(p)};transition:background .3s"></div>
      <div style="width:12px;height:2px;background:linear-gradient(90deg,${pctColor(p)},#dbeafe)"></div>
    </div>
    <div class="ob-axe" style="flex:1;min-width:0">
      <div class="ob-eyebrow" style="${EYEBROW_STYLE};color:#94a3b8">Module ${String((idx || 0) + 1).padStart(2, '0')}${a.echeance ? ` · Échéance ${formatDate(a.echeance)}` : ''}${a.responsable ? ` · ${escHtml(a.responsable)}` : ''}</div>
      <div class="ob-axe-top" style="margin-top:2px">
        <span class="ob-axe-nom">${p >= 100 ? '✅ ' : ''}${escHtml(a.nom)}</span>
        ${late ? '<span class="badge badge-red">En retard</span>' : ''}
        ${sparkSvg(a.histo)}
        <span class="ob-axe-pct" id="axpct-${o.id}-${a.id}" style="color:${pctColor(p)}">${p}%</span>
        ${_obCanEdit ? `
          <button class="btn btn-ghost btn-sm" title="Modifier l'axe" onclick="openAxeModal('${o.id}','${a.id}')">✎</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--red)" title="Supprimer l'axe" onclick="deleteAxe('${o.id}','${a.id}')">✕</button>` : ''}
      </div>
      ${a.note ? `<div class="ob-axe-note">${escHtml(a.note)}</div>` : ''}
      ${stepperHtml(o, a, p)}
      ${a.dateMaj ? `<div style="font-size:.68rem;color:var(--g400);margin-top:4px">Dernier pointage le ${formatDate(a.dateMaj)}</div>` : ''}
    </div>
  </div>`;
}

// ── PALIERS D'AUTONOMIE (modèle A) : 5 niveaux cliniques cliquables (0→4 = 0/25/50/75/100 %) ──
const NIV_STEP = EVAL_OBJ_NIVEAUX.map(n => n.label); // Non acquis · Aide importante · … · Autonome

function stepperHtml(o, a, p) {
  const cur = clampPct(p);
  const clickable = _obCanEdit;
  let html = `<div id="steprow-${o.id}-${a.id}" style="display:flex;align-items:flex-start;margin-top:10px"${clickable ? ' role="radiogroup"' : ''} aria-label="Niveau d'autonomie de l'axe ${escAttr(a.nom)}">`;
  for (let i = 0; i < 5; i++) {
    const np = i * 25, reached = cur >= np, col = reached ? pctColor(np) : '#cbd5e1';
    const interactive = clickable
      ? `role="radio" tabindex="0" aria-checked="${cur === np}" aria-label="${escAttr(NIV_STEP[i])} (${np} %)" onclick="setAxeLevel('${o.id}','${a.id}',${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();setAxeLevel('${o.id}','${a.id}',${i})}"`
      : `aria-hidden="true"`;
    html += `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:0 0 auto;width:56px">
      <div class="ob-hex ob-step" data-lvl="${i}" ${interactive}
        style="${HEX_STYLE};width:30px;height:34px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;background:${col};${clickable ? 'cursor:pointer' : ''}">${i}</div>
      <div class="ob-step-cap" style="font-size:8.5px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;color:${reached ? '#475569' : '#94a3b8'};text-align:center;line-height:1.15">${escHtml(NIV_STEP[i])}</div>
    </div>`;
    if (i < 4) {
      const seg = Math.max(0, Math.min(100, (cur - np) / 25 * 100));
      html += `<div style="flex:1;height:4px;background:#e2e8f0;border-radius:3px;margin-top:15px;overflow:hidden"><div class="ob-conn" data-after="${np}" style="width:${seg}%;height:100%;background:${pctColor(np + 25)};border-radius:3px;transition:width .5s cubic-bezier(.4,0,.2,1)"></div></div>`;
    }
  }
  html += `</div>
    <div style="text-align:center;margin-top:6px"><span class="ob-step-lbl" id="steplbl-${o.id}-${a.id}" style="font-size:.8rem;font-weight:800;color:${pctColor(cur)}">${cur >= 100 ? '★ ' : ''}${escHtml(NIV_STEP[Math.round(cur / 25)])} · ${cur}%</span></div>`;
  return html;
}

// Met à jour l'hexagone + le rang de l'objectif (retour visuel immédiat), sans re-render
function updateObjVisual(objId, avg) {
  const col = pctColor(avg);
  const hex = document.getElementById(`ring-${objId}`);
  const txt = document.getElementById(`ringtxt-${objId}`);
  const rang = document.getElementById(`rang-${objId}`);
  if (hex) hex.style.background = `conic-gradient(${col} 0 ${avg * 3.6}deg,#e2e8f0 ${avg * 3.6}deg 360deg)`;
  if (txt) { txt.textContent = avg + '%'; txt.style.color = col; }
  if (rang) rang.textContent = rangLabel(avg);
}

// Clic sur un palier : animation immédiate puis sauvegarde (progression = niveau × 25 %)
async function setAxeLevel(objId, axeId, level) {
  if (!_obCanEdit) return;
  const r = currentResident();
  if (!r) return;
  const v = level * 25;
  // Retour visuel optimiste (paliers, connecteurs, libellé, % et hexagone de l'objectif)
  const row = document.getElementById(`steprow-${objId}-${axeId}`);
  if (row) {
    row.querySelectorAll('.ob-step').forEach(h => {
      const idx = +h.dataset.lvl, np = idx * 25, reached = v >= np;
      h.style.background = reached ? pctColor(np) : '#cbd5e1';
      h.setAttribute('aria-checked', v === np);
      const cap = h.parentNode.querySelector('.ob-step-cap');
      if (cap) cap.style.color = reached ? '#475569' : '#94a3b8';
      h.style.animation = '';
      if (idx === level) { void h.offsetWidth; h.style.animation = 'obStepPulse .45s ease'; }
    });
    row.querySelectorAll('.ob-conn').forEach(c => {
      const np = +c.dataset.after;
      c.style.width = Math.max(0, Math.min(100, (v - np) / 25 * 100)) + '%';
    });
  }
  const lbl = document.getElementById(`steplbl-${objId}-${axeId}`);
  if (lbl) { lbl.textContent = (v >= 100 ? '★ ' : '') + NIV_STEP[level] + ' · ' + v + '%'; lbl.style.color = pctColor(v); }
  const pctTop = document.getElementById(`axpct-${objId}-${axeId}`);
  if (pctTop) { pctTop.textContent = v + '%'; pctTop.style.color = pctColor(v); }
  const axes = axesOf(getSuivi(r, objId));
  let sum = 0; axes.forEach(a => { sum += String(a.id) === String(axeId) ? v : clampPct(a.progression); });
  updateObjVisual(objId, axes.length ? Math.round(sum / axes.length) : v);
  // Sauvegarde
  const sv = { ...getSuivi(r, objId) };
  sv.axes = axes.map(a => String(a.id) === String(axeId) ? pointageAxe(a, v) : a);
  if (v > 0 && (!sv.statut || sv.statut === 'non_commence')) sv.statut = 'en_cours';
  try {
    await persistSuivi(r, objId, sv);
  } catch (e) { console.error('[setAxeLevel]', e); toast('Erreur enregistrement : ' + (e?.message || e), 'error'); }
  renderObjectifs();
}

// Enregistre un pointage dans l'historique (une entrée par jour, 40 max).
// dateJour permet d'antidater (évaluation saisie a posteriori) ; défaut : aujourd'hui.
function pointageAxe(a, val, dateJour) {
  const d = dateJour || today();
  const histo = (Array.isArray(a.histo) ? [...a.histo] : []).filter(h => h.d !== d);
  histo.push({ d, p: val });
  histo.sort((x, y) => (x.d || '').localeCompare(y.d || ''));
  return { ...a, progression: val, dateMaj: new Date().toISOString(), histo: histo.slice(-40) };
}

async function persistSuivi(r, objId, sv) {
  sv.dateMaj = new Date().toISOString();
  const suivi = { ...(r.objectifsSuivi || {}), [objId]: sv };
  await persistResident({ ...r, objectifsSuivi: suivi, updatedAt: new Date().toISOString() });
}

async function setObjStatut(objId, statut) {
  const r = currentResident();
  if (!r) return;
  const sv = { ...getSuivi(r, objId), statut };
  try {
    await persistSuivi(r, objId, sv);
    if (statut === 'atteint') toast('🎉 Objectif atteint — bravo !', 'success');
  } catch (e) { console.error('[setObjStatut]', e); toast('Erreur enregistrement : ' + (e?.message || e), 'error'); }
  renderObjectifs();
}

async function setObjEcheance(objId, date) {
  const r = currentResident();
  if (!r) return;
  const sv = { ...getSuivi(r, objId), echeance: date || '' };
  try {
    await persistSuivi(r, objId, sv);
  } catch (e) { console.error('[setObjEcheance]', e); toast('Erreur enregistrement : ' + (e?.message || e), 'error'); }
  renderObjectifs();
}

// ── GÉRER LES OBJECTIFS DU RÉSIDENT (catalogue) ──
// Modèles d'objectifs (localStorage, comme admin.html). Point de sortie unique
// pour faciliter la future bascule vers app_config (liste partagée).
function saveObjTemplate(name, description) {
  const objs = objTemplates();
  const newId = Math.max(0, ...objs.map(o => +o.id || 0)) + 1;
  const obj = { id: newId, name, description };
  DB.set(DB.keys.objectives, [...objs, obj]);
  return obj;
}
// Ensemble des objectifs assignés au résident affiché, autorité en mémoire du modal
// (amorcé à l'ouverture depuis r.objectifs, muté uniquement par les actions explicites).
let _catAssigned = new Set();
// Écritures sérialisées : chaque action enfile son écriture, elles s'exécutent en série
// → un double-clic ne perd plus d'affectation (last-write porte l'état complet).
let _catChain = Promise.resolve();
function catPersist() {
  const objectifs = [..._catAssigned];
  _catChain = _catChain.then(async () => {
    const r = currentResident();
    if (!r) return;
    await persistResident({ ...r, objectifs, updatedAt: new Date().toISOString() });
    renderObjectifs();
  }).catch(e => { console.error('[catPersist]', e); toast('Erreur enregistrement : ' + (e?.message || e), 'error'); });
  return _catChain;
}

function openCatalogue() {
  const r = currentResident();
  if (!r || !_obCanEdit) return;
  _catAssigned = new Set((r.objectifs || []).map(String));
  document.getElementById('catModalTitle').textContent = `Objectifs de ${resNom(r)}`;
  document.getElementById('catNewName').value = '';
  document.getElementById('catNewDesc').value = '';
  openModal('modalCatalogue');
}

// Créer un objectif et l'assigner immédiatement au résident affiché
function catCreateObjectif() {
  if (!_obCanEdit || !currentResident()) return;
  const name = document.getElementById('catNewName').value.trim();
  if (!name) { toast('Le nom de l\'objectif est requis', 'error'); return; }
  const description = document.getElementById('catNewDesc').value.trim();
  const obj = saveObjTemplate(name, description);
  _catAssigned.add(String(obj.id));
  document.getElementById('catNewName').value = '';
  document.getElementById('catNewDesc').value = '';
  document.getElementById('catNewName').focus();
  catPersist();
  toast('Objectif créé et assigné ✓');
}

// ── GRILLE D'ÉVALUATION D'UN OBJECTIF ──
// La grille est générée depuis les axes de travail : un axe = un critère noté 0-4.
// Enregistrer une évaluation synchronise la progression des axes (note × 25 %).
let eoObjId = null;

function getEvalsObj(sv) { return Array.isArray(sv.evaluations) ? sv.evaluations : []; }

function openEvalObjModal(objId) {
  const r = currentResident();
  if (!r || !_obCanEdit) return;
  const sv = getSuivi(r, objId);
  const axes = axesOf(sv);
  if (!axes.length) { toast('Définissez d\'abord des axes de travail : ce sont eux qui composent la grille d\'évaluation', 'error'); return; }
  eoObjId = objId;
  const tplObj = objTemplates().find(o => String(o.id) === String(objId));
  const derniere = getEvalsObj(sv).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  document.getElementById('eoModalTitle').textContent = `📊 Évaluer — ${tplObj ? tplObj.name : 'Objectif'}`;
  document.getElementById('eoModalInfo').textContent =
    `${resNom(r)} · chaque axe de travail est noté de « Non acquis » à « Autonome ». ` +
    `L'enregistrement met à jour la progression des axes (note × 25 %).` +
    (derniere ? ` Dernière évaluation : ${derniere.score}% le ${formatDate(derniere.date)}.` : '');
  document.getElementById('eoDate').value = today();
  document.getElementById('eoComment').value = '';
  document.getElementById('eoGrid').innerHTML = axes.map(a => {
    // Pré-remplissage : note de la dernière évaluation, sinon niveau déduit de la progression
    const pre = derniere && derniere.notes && derniere.notes[a.id] != null
      ? derniere.notes[a.id] : Math.round(clampPct(a.progression) / 25);
    return `<div class="eo-axe">
      <div class="eo-axe-nom">${escHtml(a.nom)} <span style="font-weight:400;font-size:.72rem;color:var(--g400)">(actuellement ${clampPct(a.progression)} %)</span></div>
      <div class="eo-levels" role="radiogroup" aria-label="Niveau pour ${escAttr(a.nom)}">
        ${EVAL_OBJ_NIVEAUX.map(n => `<label class="eo-level" style="--lc:${n.color}">
          <input type="radio" name="eo_${a.id}" value="${n.v}"${pre === n.v ? ' checked' : ''} onchange="eoUpdateScore()"/>${n.v} · ${n.label}</label>`).join('')}
      </div>
    </div>`;
  }).join('');
  eoUpdateScore();
  openModal('modalEvalObj');
}

function eoLireNotes() {
  const r = currentResident();
  if (!r || !eoObjId) return { notes: {}, total: 0 };
  const notes = {};
  let total = 0;
  axesOf(getSuivi(r, eoObjId)).forEach(a => {
    const sel = document.querySelector(`input[name="eo_${a.id}"]:checked`);
    if (sel) { notes[a.id] = +sel.value; total++; }
  });
  return { notes, total };
}

function eoUpdateScore() {
  const r = currentResident();
  if (!r || !eoObjId) return;
  const nbAxes = axesOf(getSuivi(r, eoObjId)).length;
  const { notes, total } = eoLireNotes();
  const el = document.getElementById('eoLiveScore');
  if (!total) { el.innerHTML = '<span style="color:var(--muted);font-size:.85rem">Notez chaque axe ci-dessous…</span>'; return; }
  const somme = Object.values(notes).reduce((s, v) => s + v, 0);
  const score = Math.round(somme / (nbAxes * 4) * 100);
  el.innerHTML = `<span style="font-size:1.25rem;font-weight:800;color:${pctColor(score)}">${score}%</span>
    <span style="font-size:.75rem;color:var(--muted)"> · ${somme}/${nbAxes * 4} points · ${total}/${nbAxes} axe${nbAxes > 1 ? 's' : ''} noté${total > 1 ? 's' : ''}</span>`;
}

async function saveEvalObj() {
  const r = currentResident();
  if (!r || !eoObjId) return;
  const date = document.getElementById('eoDate').value;
  if (!date) { toast('La date est requise', 'error'); return; }
  const sv = { ...getSuivi(r, eoObjId) };
  const axes = axesOf(sv);
  const { notes, total } = eoLireNotes();
  if (total < axes.length) { toast(`Notez tous les axes (${total}/${axes.length})`, 'error'); return; }
  const somme = Object.values(notes).reduce((s, v) => s + v, 0);
  const score = Math.round(somme / (axes.length * 4) * 100);
  const s = Auth.getSession();
  const evaluation = {
    id: genId(), date, notes, score,
    commentaire: document.getElementById('eoComment').value.trim(),
    auteur: s ? (`${s.prenom || ''} ${s.nom || ''}`.trim() || s.username || '') : '',
    createdAt: new Date().toISOString()
  };
  sv.evaluations = [...getEvalsObj(sv), evaluation];
  // Synchronisation : la note de chaque axe pilote sa progression (0→0 %, 4→100 %)
  sv.axes = axes.map(a => notes[a.id] != null ? pointageAxe(a, notes[a.id] * 25, date) : a);
  if (score > 0 && (!sv.statut || sv.statut === 'non_commence')) sv.statut = 'en_cours';
  try {
    await persistSuivi(r, eoObjId, sv);
    toast('Évaluation enregistrée — progression des axes mise à jour ✓');
  } catch (e) { console.error('[saveEvalObj]', e); toast('Erreur enregistrement : ' + (e?.message || e), 'error'); return; }
  closeModal('modalEvalObj');
  renderObjectifs();
}

function deleteEvalObj(objId, evalId) {
  confirmDialog('Supprimer cette évaluation ? (la progression actuelle des axes n\'est pas modifiée)', async () => {
    const r = currentResident();
    if (!r) return;
    const sv = { ...getSuivi(r, objId) };
    sv.evaluations = getEvalsObj(sv).filter(e => String(e.id) !== String(evalId));
    try {
      await persistSuivi(r, objId, sv);
    } catch (e) { console.error('[deleteEvalObj]', e); toast('Erreur suppression : ' + (e?.message || e), 'error'); return; }
    renderObjectifs();
    toast('Évaluation supprimée', 'info');
  });
}

// Ligne d'historique : score, évolution vs précédente, détail dépliable par axe
function evalObjRow(o, ev, prec, axes) {
  const delta = prec && prec.score != null && ev.score != null ? ev.score - prec.score : null;
  const deltaBadge = delta == null || delta === 0 ? ''
    : `<span style="font-size:.72rem;font-weight:700;color:${delta > 0 ? '#16a34a' : '#dc2626'}">${delta > 0 ? '▲ +' : '▼ '}${delta}</span>`;
  const detail = Object.entries(ev.notes || {}).map(([axeId, note]) => {
    const axe = axes.find(a => String(a.id) === String(axeId));
    const niv = EVAL_OBJ_NIVEAUX.find(n => n.v === +note) || EVAL_OBJ_NIVEAUX[0];
    return `<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
      <span style="flex:1;min-width:140px">${axe ? escHtml(axe.nom) : '<em>(axe supprimé)</em>'}</span>
      <span class="badge" style="background:${niv.color}1a;color:${niv.color}">${niv.v} · ${niv.label}</span>
    </div>`;
  }).join('');
  return `<details class="eo-histo">
    <summary>
      <span style="width:8px;height:8px;border-radius:50%;background:${pctColor(ev.score)};box-shadow:0 0 6px ${pctColor(ev.score)}66;flex-shrink:0" aria-hidden="true"></span>
      <span style="font-weight:700">${formatDate(ev.date)}</span>
      <span class="badge" style="background:${pctColor(ev.score)}1a;color:${pctColor(ev.score)};font-weight:800">${ev.score}%</span>
      ${deltaBadge}
      ${ev.auteur ? `<span style="font-size:.7rem;color:var(--g400)">par ${escHtml(ev.auteur)}</span>` : ''}
      <span style="margin-left:auto;font-size:.68rem;color:var(--g400)">détail ▾</span>
      ${_obCanEdit ? `<button class="btn btn-ghost btn-sm" style="color:var(--red)" title="Supprimer cette évaluation" onclick="event.preventDefault();event.stopPropagation();deleteEvalObj('${o.id}','${ev.id}')">✕</button>` : ''}
    </summary>
    <div class="eo-histo-body">
      ${detail}
      ${ev.commentaire ? `<div style="color:var(--g700);margin-top:.2rem">💬 ${escHtml(ev.commentaire)}</div>` : ''}
    </div>
  </details>`;
}

// ── CRUD AXES ──
function openAxeModal(objId, axeId) {
  const r = currentResident();
  if (!r || !_obCanEdit) return;
  obAxeCtx = { objId, axeId: axeId || null };
  const sv = getSuivi(r, objId);
  const a = axeId ? axesOf(sv).find(x => String(x.id) === String(axeId)) || {} : {};
  const tplObj = objTemplates().find(o => String(o.id) === String(objId));
  document.getElementById('axModalTitle').textContent = axeId ? 'Modifier l\'axe de travail' : 'Nouvel axe de travail';
  document.getElementById('axModalObjectif').textContent = tplObj ? `Objectif : ${tplObj.name}` : '';
  document.getElementById('axNom').value = a.nom || '';
  document.getElementById('axEcheance').value = a.echeance || '';
  document.getElementById('axResp').value = a.responsable || '';
  document.getElementById('axNote').value = a.note || '';
  // Suggestions d'axes (création uniquement), en écartant celles déjà utilisées
  const wrap = document.getElementById('axSuggestWrap');
  if (!axeId) {
    const deja = axesOf(sv).map(x => (x.nom || '').toLowerCase());
    const sugg = axeSuggestions(tplObj).filter(sg => !deja.includes(sg.toLowerCase()));
    document.getElementById('axSuggest').innerHTML = sugg.map(sg =>
      `<button type="button" class="ax-chip" data-v="${escAttr(sg)}" onclick="document.getElementById('axNom').value = this.dataset.v">${escHtml(sg)}</button>`).join('');
    wrap.style.display = sugg.length ? '' : 'none';
  } else wrap.style.display = 'none';
  axRenderSteps(clampPct(a.progression));
  openModal('modalAxe');
}

// Sélecteur de niveau du modal : mêmes 5 paliers que les cartes (0→4 = 0/25/50/75/100 %)
function axRenderSteps(pct) {
  const cur = clampPct(pct);
  document.getElementById('axProgression').value = cur;
  const out = document.getElementById('axProgVal');
  out.textContent = (cur >= 100 ? '★ ' : '') + NIV_STEP[Math.round(cur / 25)] + ' · ' + cur + '%';
  out.style.color = pctColor(cur);
  let html = '';
  for (let i = 0; i < 5; i++) {
    const np = i * 25, reached = cur >= np, col = reached ? pctColor(np) : '#cbd5e1';
    html += `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:0 0 auto;width:56px">
      <div class="ob-hex ob-step" role="radio" tabindex="0" aria-checked="${cur === np}" aria-label="${escAttr(NIV_STEP[i])} (${np} %)"
        onclick="axStepPick(${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();axStepPick(${i})}"
        style="${HEX_STYLE};width:30px;height:34px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;background:${col};cursor:pointer">${i}</div>
      <div style="font-size:8.5px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;color:${reached ? '#475569' : '#94a3b8'};text-align:center;line-height:1.15">${escHtml(NIV_STEP[i])}</div>
    </div>`;
    if (i < 4) {
      const seg = Math.max(0, Math.min(100, (cur - np) / 25 * 100));
      html += `<div style="flex:1;height:4px;background:#e2e8f0;border-radius:3px;margin-top:15px;overflow:hidden"><div style="width:${seg}%;height:100%;background:${pctColor(np + 25)};border-radius:3px;transition:width .4s"></div></div>`;
    }
  }
  document.getElementById('axSteps').innerHTML = html;
}

function axStepPick(level) {
  axRenderSteps(level * 25);
  const el = document.getElementById('axSteps').querySelectorAll('.ob-step')[level];
  if (el) { el.style.animation = ''; void el.offsetWidth; el.style.animation = 'obStepPulse .45s ease'; }
}

async function saveAxe() {
  const r = currentResident();
  if (!r || !obAxeCtx) return;
  const nom = document.getElementById('axNom').value.trim();
  if (!nom) { toast('Le nom de l\'axe est requis', 'error'); return; }
  const val = clampPct(document.getElementById('axProgression').value);
  const echeance = document.getElementById('axEcheance').value;
  const responsable = document.getElementById('axResp').value.trim();
  const note = document.getElementById('axNote').value.trim();
  const sv = { ...getSuivi(r, obAxeCtx.objId) };
  const axes = axesOf(sv);
  if (obAxeCtx.axeId) {
    sv.axes = axes.map(a => String(a.id) === String(obAxeCtx.axeId)
      ? pointageAxe({ ...a, nom, echeance, responsable, note }, val) : a);
  } else {
    sv.axes = [...axes, pointageAxe({ id: genId(), nom, echeance, responsable, note, progression: 0, histo: [] }, val)];
  }
  if (val > 0 && (!sv.statut || sv.statut === 'non_commence')) sv.statut = 'en_cours';
  try {
    await persistSuivi(r, obAxeCtx.objId, sv);
    toast(obAxeCtx.axeId ? 'Axe mis à jour ✓' : 'Axe de travail ajouté ✓');
  } catch (e) { console.error('[saveAxe]', e); toast('Erreur enregistrement : ' + (e?.message || e), 'error'); return; }
  closeModal('modalAxe');
  renderObjectifs();
}

function deleteAxe(objId, axeId) {
  confirmDialog('Supprimer cet axe de travail ? Son historique de progression sera perdu.', async () => {
    const r = currentResident();
    if (!r) return;
    const sv = { ...getSuivi(r, objId) };
    sv.axes = axesOf(sv).filter(a => String(a.id) !== String(axeId));
    try {
      await persistSuivi(r, objId, sv);
    } catch (e) { console.error('[deleteAxe]', e); toast('Erreur suppression : ' + (e?.message || e), 'error'); return; }
    renderObjectifs();
    toast('Axe supprimé', 'info');
  });
}

// ── ONGLETS (page fusionnée avec les grilles d'évaluation) ──
function obSwitchTab(tab) {
  const isEv = tab === 'evaluations';
  document.getElementById('obTabObjectifs').style.display = isEv ? 'none' : '';
  document.getElementById('obTabEvals').style.display = isEv ? '' : 'none';
  document.getElementById('obTabBtnObjectifs').classList.toggle('active', !isEv);
  document.getElementById('obTabBtnEvals').classList.toggle('active', isEv);
  sessionStorage.setItem('ob_tab', isEv ? 'evaluations' : 'objectifs');
}

// ── INIT ──
async function initObjectifs() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('view_residents')) return;
  // Admin/modérateur : toujours éditeurs (même sans « fonction » dans la liste des permissions),
  // comme sur la fiche résident. Les autres passent par la permission edit_residents.
  _obCanEdit = ['admin', 'moderator', 'superadmin'].includes(s.role)
    || ((typeof canEditResidents === 'function') ? canEditResidents(s.userId) : Auth.isAdmin());
  await loadResidentsCache();
  // Tous les résidents actifs (pas seulement ceux ayant déjà des objectifs),
  // pour pouvoir assigner des objectifs à un nouveau résident depuis cette page.
  const opts = residentsActifs()
    .map(r => `<option value="${r.id}">${escHtml(resNom(r))}</option>`).join('');
  document.getElementById('obResident').innerHTML = '<option value="">Tous les résidents — vue d\'ensemble</option>' + opts;
  const param = new URLSearchParams(location.search).get('resident');
  if (param && _obResidents.some(r => String(r.id) === String(param))) document.getElementById('obResident').value = param;
  ['obResident', 'obFilterStatut'].forEach(id => document.getElementById(id)?.addEventListener('change', renderObjectifs));
  // Guide déplié tant que rien n'est configuré
  const guide = document.getElementById('obGuide');
  if (guide && !residentsAvecObjectifs().length) guide.open = true;
  // Onglet initial : les paramètres explicites priment sur le dernier onglet mémorisé.
  // ?resident= → objectifs ; ?tab=evaluations ou ?residentId=/?id= (anciens liens
  // evaluations.html) → grilles d'évaluation.
  const q = new URLSearchParams(location.search);
  const initialTab = q.get('resident') ? 'objectifs'
    : (q.get('tab') === 'evaluations' || q.get('residentId') || q.get('id')) ? 'evaluations'
    : (sessionStorage.getItem('ob_tab') || 'objectifs');
  obSwitchTab(initialTab);
  renderObjectifs();
  // Lien profond depuis la fiche résident : ?resident=X&evaluer=OBJID ouvre la grille
  const evaluer = q.get('evaluer');
  if (evaluer && currentResident()) openEvalObjModal(evaluer);
}
document.addEventListener('DOMContentLoaded', initObjectifs);
