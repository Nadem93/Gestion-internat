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
const RING_C = 213.63; // circonférence du cercle de progression (r=34)

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
function pctColor(p) { return p >= 100 ? '#16a34a' : p >= 67 ? '#0d9488' : p >= 34 ? '#6366f1' : '#d97706'; }
// escHtml n'échappe pas les guillemets : indispensable pour du texte injecté dans un attribut HTML
function escAttr(s) { return escHtml(s).replace(/"/g, '&quot;'); }

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

// ── Visuels SVG ──
function ringSvg(pct, id, size) {
  const s = size || 84;
  const known = pct != null;
  const p = known ? clampPct(pct) : 0;
  const off = RING_C - RING_C * p / 100;
  const color = known ? pctColor(p) : 'var(--g200)';
  return `<svg width="${s}" height="${s}" viewBox="0 0 80 80" class="ob-ring" role="img" aria-label="Progression ${known ? p + ' %' : 'non mesurée'}">
    <circle cx="40" cy="40" r="34" fill="none" stroke="var(--g100)" stroke-width="8"/>
    <circle id="ring-${id}" cx="40" cy="40" r="34" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="${RING_C}" stroke-dashoffset="${off}" transform="rotate(-90 40 40)"
      style="transition:stroke-dashoffset .6s cubic-bezier(.4,0,.2,1),stroke .3s"/>
    <text id="ringtxt-${id}" x="40" y="44" text-anchor="middle" font-size="17" font-weight="800" fill="${known ? 'var(--text)' : 'var(--g400)'}" font-family="inherit">${known ? p + '%' : '—'}</text>
  </svg>`;
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
    <polyline points="${pts}" fill="none" stroke="#818cf8" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${w - 2}" cy="${y(last.p)}" r="2.2" fill="#6366f1"/></svg>`;
}

// Courbe d'évolution de l'objectif : moyenne des axes reconstruite jour par jour
// depuis les historiques de pointage (report de la dernière valeur connue par axe).
function objChartSvg(sv) {
  const axes = axesOf(sv);
  if (!axes.length) return '';
  const dates = [...new Set(axes.flatMap(a => (Array.isArray(a.histo) ? a.histo : []).map(h => h.d)))].sort();
  if (dates.length < 2) return '';
  const series = dates.map(d => {
    let sum = 0;
    axes.forEach(a => {
      const h = (Array.isArray(a.histo) ? a.histo : []).filter(x => x.d <= d);
      sum += h.length ? clampPct(h[h.length - 1].p) : 0;
    });
    return Math.round(sum / axes.length);
  });
  const x = i => 10 + i / (dates.length - 1) * 300;
  const y = v => 58 - v / 100 * 46;
  const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = series[series.length - 1];
  return `<div style="margin-top:.8rem">
    <div style="font-size:.68rem;font-weight:700;color:var(--g400);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.2rem">Évolution de l'objectif</div>
    <svg viewBox="0 0 320 72" style="width:100%;height:auto;display:block" role="img" aria-label="Évolution de la progression : de ${series[0]} % à ${last} %">
      <line x1="10" y1="12" x2="310" y2="12" stroke="var(--g100)" stroke-width="1" stroke-dasharray="3 3"/>
      <line x1="10" y1="58" x2="310" y2="58" stroke="var(--g100)" stroke-width="1"/>
      <text x="313" y="15" font-size="8" fill="var(--g400)">100</text>
      <polygon points="10,58 ${pts} 310,58" fill="${pctColor(last)}22"/>
      <polyline points="${pts}" fill="none" stroke="${pctColor(last)}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${series.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.4" fill="${pctColor(v)}"/>`).join('')}
      <text x="10" y="70" font-size="8" fill="var(--g400)">${formatDate(dates[0])}</text>
      <text x="310" y="70" font-size="8" fill="var(--g400)" text-anchor="end">${formatDate(dates[dates.length - 1])}</text>
    </svg></div>`;
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
      ${ringSvg(global, 'res-' + r.id, 68)}
      <div class="ob-res-info">
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
    ? `<select class="ob-statut-sel" onchange="setObjStatut('${o.id}', this.value)" aria-label="Statut de l'objectif ${escAttr(o.name)}" style="border-color:${st.color};color:${st.color}">
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
    ? axes.map(a => axeRow(o, a)).join('')
    : `<div style="font-size:.78rem;color:var(--muted);padding:.5rem .25rem">Aucun axe de travail défini. ${_obCanEdit ? 'Découpez cet objectif en étapes concrètes et mesurables — des suggestions vous seront proposées.' : ''}</div>`;

  return `<div class="card ob-card" style="border-left:4px solid ${st.color}">
    <div class="ob-card-head">
      ${ringSvg(pct, o.id, 84)}
      <div style="flex:1;min-width:0">
        <div class="ob-card-title">
          <span style="font-weight:800;font-size:.95rem">${escHtml(o.name)}</span>
          ${statutUi}
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
      ${objChartSvg(sv)}
    </div>
  </div>`;
}

function axeRow(o, a) {
  const p = clampPct(a.progression);
  const late = a.echeance && a.echeance < today() && p < 100;
  return `<div class="ob-axe" style="border-left:3px solid ${pctColor(p)}">
    <div class="ob-axe-top">
      <span class="ob-axe-nom">${p >= 100 ? '✅ ' : ''}${escHtml(a.nom)}</span>
      ${late ? '<span class="badge badge-red">En retard</span>' : ''}
      ${a.echeance ? `<span class="ob-axe-meta">📅 ${formatDate(a.echeance)}</span>` : ''}
      ${a.responsable ? `<span class="ob-axe-meta">👤 ${escHtml(a.responsable)}</span>` : ''}
      ${sparkSvg(a.histo)}
      <span class="ob-axe-pct" id="axpct-${o.id}-${a.id}" style="color:${pctColor(p)}">${p}%</span>
      ${_obCanEdit ? `
        <button class="btn btn-ghost btn-sm" title="Modifier l'axe" onclick="openAxeModal('${o.id}','${a.id}')">✎</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" title="Supprimer l'axe" onclick="deleteAxe('${o.id}','${a.id}')">✕</button>` : ''}
    </div>
    ${a.note ? `<div class="ob-axe-note">${escHtml(a.note)}</div>` : ''}
    ${_obCanEdit
      ? `<input type="range" class="ob-range" min="0" max="100" step="5" value="${p}"
          data-obj="${o.id}" data-axe="${a.id}" aria-label="Progression de l'axe ${escAttr(a.nom)}"
          style="background:linear-gradient(90deg,${pctColor(p)} ${p}%,var(--g100) ${p}%)"
          oninput="onAxeSlide(this)" onchange="commitAxeProgression(this)"/>`
      : `<div class="ob-bar"><div style="height:100%;width:${p}%;background:${pctColor(p)};border-radius:3px;transition:width .3s"></div></div>`}
    ${a.dateMaj ? `<div style="font-size:.68rem;color:var(--g400);margin-top:2px">Dernier pointage le ${formatDate(a.dateMaj)}</div>` : ''}
  </div>`;
}

// ── Interactions curseur : retour visuel immédiat (anneau + couleur), sauvegarde au relâchement ──
function onAxeSlide(el) {
  const v = clampPct(el.value);
  el.style.background = `linear-gradient(90deg,${pctColor(v)} ${v}%,var(--g100) ${v}%)`;
  const lbl = document.getElementById(`axpct-${el.dataset.obj}-${el.dataset.axe}`);
  if (lbl) { lbl.textContent = v + '%'; lbl.style.color = pctColor(v); }
  // Recalcule l'anneau de l'objectif à partir des curseurs affichés
  const sliders = document.querySelectorAll(`.ob-range[data-obj="${el.dataset.obj}"]`);
  if (!sliders.length) return;
  let sum = 0; sliders.forEach(s => { sum += clampPct(s.value); });
  const avg = Math.round(sum / sliders.length);
  const ring = document.getElementById(`ring-${el.dataset.obj}`);
  const txt = document.getElementById(`ringtxt-${el.dataset.obj}`);
  if (ring) { ring.setAttribute('stroke-dashoffset', RING_C - RING_C * avg / 100); ring.setAttribute('stroke', pctColor(avg)); }
  if (txt) txt.textContent = avg + '%';
}

async function commitAxeProgression(el) {
  const r = currentResident();
  if (!r) return;
  const objId = el.dataset.obj, axeId = el.dataset.axe, val = clampPct(el.value);
  const sv = { ...getSuivi(r, objId) };
  sv.axes = axesOf(sv).map(a => String(a.id) === String(axeId) ? pointageAxe(a, val) : a);
  if (val > 0 && (!sv.statut || sv.statut === 'non_commence')) sv.statut = 'en_cours';
  try {
    await persistSuivi(r, objId, sv);
  } catch (e) { console.error('[commitAxeProgression]', e); toast('Erreur enregistrement : ' + (e?.message || e), 'error'); }
  renderObjectifs();
}

// Enregistre le pointage du jour dans l'historique (une entrée par jour, 40 max)
function pointageAxe(a, val) {
  const d = today();
  const histo = Array.isArray(a.histo) ? [...a.histo] : [];
  if (histo.length && histo[histo.length - 1].d === d) histo[histo.length - 1] = { d, p: val };
  else histo.push({ d, p: val });
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
function openCatalogue() {
  const r = currentResident();
  if (!r || !_obCanEdit) return;
  const tpl = objTemplates();
  if (!tpl.length) { toast('Aucun modèle d\'objectif — créez-les dans Administration → onglet Objectifs', 'error'); return; }
  const assigned = (r.objectifs || []).map(String);
  document.getElementById('catModalTitle').textContent = `Objectifs de ${resNom(r)}`;
  document.getElementById('catList').innerHTML = tpl.map(o => `
    <label class="cat-item">
      <input type="checkbox" name="catObj" value="${o.id}"${assigned.includes(String(o.id)) ? ' checked' : ''}/>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:.85rem">${escHtml(o.name)}</div>
        ${o.description ? `<div style="font-size:.74rem;color:var(--muted)">${escHtml(o.description)}</div>` : ''}
      </div>
    </label>`).join('');
  openModal('modalCatalogue');
}

async function saveCatalogue() {
  const r = currentResident();
  if (!r) return;
  const checked = [...document.querySelectorAll('input[name="catObj"]:checked')].map(el => el.value);
  try {
    await persistResident({ ...r, objectifs: checked, updatedAt: new Date().toISOString() });
    toast('Objectifs mis à jour ✓');
  } catch (e) { console.error('[saveCatalogue]', e); toast('Erreur enregistrement : ' + (e?.message || e), 'error'); return; }
  closeModal('modalCatalogue');
  renderObjectifs();
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
  const p = clampPct(a.progression);
  const range = document.getElementById('axProgression');
  range.value = p;
  axModalSlide(range);
  openModal('modalAxe');
}

function axModalSlide(el) {
  const v = clampPct(el.value);
  el.style.background = `linear-gradient(90deg,${pctColor(v)} ${v}%,var(--g100) ${v}%)`;
  const out = document.getElementById('axProgVal');
  out.textContent = v + '%';
  out.style.color = pctColor(v);
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

// ── INIT ──
async function initObjectifs() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('view_residents')) return;
  _obCanEdit = (typeof canEditResidents === 'function') ? canEditResidents(s.userId) : Auth.isAdmin();
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
  renderObjectifs();
}
document.addEventListener('DOMContentLoaded', initObjectifs);
