// ── OBJECTIFS PERSONNALISÉS & AXES DE TRAVAIL ──
// Chaque objectif assigné au résident (r.objectifs, modèles gérés dans Admin) se décompose ici
// en axes de travail concrets, chacun avec sa progression 0-100 %.
// Stockage : r.objectifsSuivi[objId] = { statut, note, dateMaj, axes:[{id, nom, progression, echeance, note, dateMaj, histo:[{d,p}]}] }
// → colonne jsonb objectifs_suivi de la table residents, déjà mappée : aucune migration nécessaire.

const OBJ_STATUTS = {
  non_commence: { label: 'Non commencé', cls: 'badge-gray', color: '#64748b' },
  en_cours: { label: 'En cours', cls: 'badge-amber', color: '#d97706' },
  atteint: { label: 'Atteint', cls: 'badge-green', color: '#16a34a' },
  abandonne: { label: 'Abandonné', cls: 'badge-red', color: '#dc2626' }
};
const RING_C = 213.63; // circonférence du cercle de progression (r=34)

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
function residentsAvecObjectifs() {
  return _obResidents.filter(r => r.statut !== 'sorti' && (r.objectifs || []).length)
    .sort((a, b) => `${a.nom || ''}`.localeCompare(`${b.nom || ''}`, 'fr'));
}
function getSuivi(r, objId) { return (r.objectifsSuivi || {})[objId] || {}; }
function axesOf(sv) { return Array.isArray(sv.axes) ? sv.axes : []; }

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
  if (!resObjs.length) {
    el.innerHTML = emptyBox(`Aucun objectif n'est assigné à ce résident.<br>
      <span style="font-size:.78rem">Assignez des objectifs depuis sa <a href="resident.html?id=${r.id}" style="color:var(--accent)">fiche résident</a> (Modifier → section Objectifs). Les modèles d'objectifs se gèrent dans Administration.</span>`);
    return;
  }
  const cards = resObjs
    .filter(o => !fStatut || (getSuivi(r, o.id).statut || 'non_commence') === fStatut)
    .map(o => objectifCard(r, o));
  el.innerHTML = cards.length ? cards.join('') : emptyBox('Aucun objectif ne correspond à ce filtre.');
}

function emptyBox(html) {
  return `<div class="empty" style="padding:2.5rem"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div><p>${html}</p></div>`;
}

// Vue d'ensemble : un anneau global par résident, cliquable
function renderOverview(residents, tpl) {
  if (!residents.length) {
    return emptyBox(`Aucun résident n'a d'objectif assigné pour le moment.<br>
      <span style="font-size:.78rem">Assignez des objectifs depuis la fiche de chaque résident (Modifier → section Objectifs).</span>`);
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
    return `<button class="ob-res-card" onclick="obSelectResident('${r.id}')" aria-label="Voir les objectifs de ${escAttr(`${r.prenom || ''} ${r.nom || ''}`.trim())}">
      ${ringSvg(global, 'res-' + r.id, 68)}
      <div class="ob-res-info">
        <div class="ob-res-nom">${escHtml(`${r.prenom || ''} ${r.nom || ''}`.trim())}</div>
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

// Carte détaillée d'un objectif : anneau + statut + axes de travail
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

  const cta = _obCanEdit && pct === 100 && sv.statut !== 'atteint'
    ? `<button class="btn btn-sm" style="background:#16a34a;color:#fff;border:none" onclick="setObjStatut('${o.id}','atteint')">🎉 Tous les axes à 100 % — marquer atteint</button>`
    : '';

  const axesHtml = axes.length
    ? axes.map(a => axeRow(o, a)).join('')
    : `<div style="font-size:.78rem;color:var(--muted);padding:.5rem .25rem">Aucun axe de travail défini. ${_obCanEdit ? 'Découpez cet objectif en étapes concrètes et mesurables.' : ''}</div>`;

  return `<div class="card ob-card" style="border-left:4px solid ${st.color}">
    <div class="ob-card-head">
      ${ringSvg(pct, o.id, 84)}
      <div style="flex:1;min-width:0">
        <div class="ob-card-title">
          <span style="font-weight:800;font-size:.95rem">${escHtml(o.name)}</span>
          ${statutUi}
        </div>
        ${o.description ? `<div style="font-size:.78rem;color:var(--muted);margin-top:2px">${escHtml(o.description)}</div>` : ''}
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

// ── CRUD AXES ──
function openAxeModal(objId, axeId) {
  const r = currentResident();
  if (!r || !_obCanEdit) return;
  obAxeCtx = { objId, axeId: axeId || null };
  const a = axeId ? axesOf(getSuivi(r, objId)).find(x => String(x.id) === String(axeId)) || {} : {};
  const tplObj = objTemplates().find(o => String(o.id) === String(objId));
  document.getElementById('axModalTitle').textContent = axeId ? 'Modifier l\'axe de travail' : 'Nouvel axe de travail';
  document.getElementById('axModalObjectif').textContent = tplObj ? `Objectif : ${tplObj.name}` : '';
  document.getElementById('axNom').value = a.nom || '';
  document.getElementById('axEcheance').value = a.echeance || '';
  document.getElementById('axNote').value = a.note || '';
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
  const note = document.getElementById('axNote').value.trim();
  const sv = { ...getSuivi(r, obAxeCtx.objId) };
  const axes = axesOf(sv);
  if (obAxeCtx.axeId) {
    sv.axes = axes.map(a => String(a.id) === String(obAxeCtx.axeId)
      ? pointageAxe({ ...a, nom, echeance, note }, val) : a);
  } else {
    sv.axes = [...axes, pointageAxe({ id: genId(), nom, echeance, note, progression: 0, histo: [] }, val)];
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
  const opts = residentsAvecObjectifs()
    .map(r => `<option value="${r.id}">${escHtml(`${r.prenom || ''} ${r.nom || ''}`.trim())}</option>`).join('');
  document.getElementById('obResident').innerHTML = '<option value="">Tous les résidents — vue d\'ensemble</option>' + opts;
  const param = new URLSearchParams(location.search).get('resident');
  if (param && _obResidents.some(r => String(r.id) === String(param))) document.getElementById('obResident').value = param;
  ['obResident', 'obFilterStatut'].forEach(id => document.getElementById(id)?.addEventListener('change', renderObjectifs));
  renderObjectifs();
}
document.addEventListener('DOMContentLoaded', initObjectifs);
