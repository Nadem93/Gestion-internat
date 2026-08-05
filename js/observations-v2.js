// ── OBSERVATIONS & ÉCHELLES CLINIQUES — rendu (Console Data) ──
// Page : sélecteur résident, dernier score par grille (KPI), courbe de tendance,
// historique des relevés, modale de saisie. S'appuie sur observations-supabase.js
// (OBS_GRILLES, obsTotal, obsInterpret, sbGet/Save/DeleteObservation).

let _obsResidents = [];   // liste résidents (triée par nom)
let _obsAll = [];         // toutes les observations de l'établissement
let _obsResidentId = '';  // résident sélectionné
let _obsGrilleId = 'douleur'; // grille active pour courbe + historique
let _obsSession = null;

// ── Helpers ──────────────────────────────────────────────────────────────
function _obsEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function _obsResName(r) { return r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : ''; }
function _obsInitiales(r) {
  return ((r?.prenom || ' ')[0] + (r?.nom || ' ')[0]).toUpperCase();
}
function _obsColor(r) {
  const pal = ['#6366f1', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed', '#0ea5e9', '#e11d48', '#16a34a', '#f59e0b'];
  const s = (r?.id || r?.nom || '') + '';
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return pal[h % pal.length];
}
const _OBS_MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
function _obsDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length <= 10 ? 'T00:00:00' : ''));
  if (isNaN(d)) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function _obsDateLong(iso) {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length <= 10 ? 'T00:00:00' : ''));
  if (isNaN(d)) return iso;
  return `${d.getDate()} ${_OBS_MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Init ─────────────────────────────────────────────────────────────────
async function obsInit() {
  _obsSession = Auth.requireAuth();
  if (!_obsSession) return;
  try {
    const [residents, obs] = await Promise.all([
      sbGetResidents(),
      sbGetObservations()
    ]);
    _obsResidents = (residents || []).slice().sort((a, b) =>
      _obsResName(a).localeCompare(_obsResName(b), 'fr'));
    _obsAll = obs || [];
  } catch (e) {
    console.error('[observations] chargement', e);
    if (typeof showToast === 'function') showToast('Erreur de chargement des observations', 'error');
  }

  // Pré-sélection par ?residentId=… sinon premier résident.
  const qs = new URLSearchParams(location.search);
  const wanted = qs.get('residentId') || qs.get('resident');
  _obsResidentId = (wanted && _obsResidents.some(r => String(r.id) === String(wanted)))
    ? String(wanted)
    : (_obsResidents[0] ? String(_obsResidents[0].id) : '');

  _obsFillResidentSelect();
  document.getElementById('obsResident')?.addEventListener('change', e => {
    _obsResidentId = e.target.value;
    obsRender();
  });
  document.getElementById('btnObsNew')?.addEventListener('click', () => obsOpenModal());

  obsRender();
}

function _obsFillResidentSelect() {
  const sel = document.getElementById('obsResident');
  if (!sel) return;
  sel.innerHTML = _obsResidents.map(r =>
    `<option value="${_obsEsc(r.id)}">${_obsEsc(_obsResName(r))}</option>`).join('')
    || '<option value="">Aucun résident</option>';
  sel.value = _obsResidentId;
}

function _obsCurrentResident() {
  return _obsResidents.find(r => String(r.id) === String(_obsResidentId)) || null;
}
function _obsResidentObs(residentId, grilleId) {
  let list = _obsAll.filter(o => String(o.residentId) === String(residentId));
  if (grilleId && grilleId !== 'all') list = list.filter(o => o.grille === grilleId);
  return list;
}

// ── Rendu principal ────────────────────────────────────────────────────────
function obsRender() {
  _obsRenderHeader();
  _obsRenderKpis();
  _obsRenderTrend();
  _obsRenderHistory();
}

function _obsRenderHeader() {
  const r = _obsCurrentResident();
  const el = document.getElementById('obsResHead');
  if (!el) return;
  if (!r) { el.innerHTML = ''; return; }
  const c = _obsColor(r);
  const av = r.photo
    ? `<img src="${_obsEsc(r.photo)}" alt=""/>`
    : _obsInitiales(r);
  const n = _obsResidentObs(r.id, 'all').length;
  el.innerHTML = `
    <div class="obs-rh-av" style="background:${c}">${av}</div>
    <div class="obs-rh-id">
      <div class="obs-rh-nom">${_obsEsc(_obsResName(r))}</div>
      <div class="obs-rh-meta">${r.chambre ? 'Ch. ' + _obsEsc(r.chambre) + ' · ' : ''}${n} relevé${n > 1 ? 's' : ''}</div>
    </div>`;
}

// KPI : dernier score par grille (carte cliquable → filtre courbe/historique).
function _obsRenderKpis() {
  const host = document.getElementById('obsKpis');
  if (!host) return;
  const r = _obsCurrentResident();
  if (!r) { host.innerHTML = '<div class="obs-empty">Sélectionnez un résident.</div>'; return; }

  host.innerHTML = OBS_GRILLES.map(g => {
    const list = _obsResidentObs(r.id, g.id).slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1)); // récent d'abord
    const last = list[0];
    const active = _obsGrilleId === g.id;
    const inter = last ? obsInterpret(g, last.total) : null;
    const val = last ? `${last.total}` : '—';
    const denom = obsMaxScore(g);
    const tone = inter ? inter.tone : 'gray';
    return `
      <button type="button" class="obs-kpi dc-b-${tone}${active ? ' on' : ''}"
              style="--gc:${g.c}" onclick="obsSelectGrille('${g.id}')">
        <span class="obs-kpi-eyebrow">${_obsEsc(g.nom)}</span>
        <span class="obs-kpi-val">${val}<span class="obs-kpi-denom">/${denom}</span></span>
        <span class="obs-kpi-niv">${last ? _obsEsc(inter.niveau) : 'Aucun relevé'}</span>
        <span class="obs-kpi-date">${last ? _obsDateShort(last.date) : ''}</span>
      </button>`;
  }).join('');
}

function obsSelectGrille(id) {
  _obsGrilleId = id;
  _obsRenderKpis();
  _obsRenderTrend();
  _obsRenderHistory();
}

// Courbe de tendance (SVG) — score dans le temps pour la grille active.
function _obsRenderTrend() {
  const host = document.getElementById('obsTrend');
  if (!host) return;
  const r = _obsCurrentResident();
  const g = obsGrille(_obsGrilleId);
  if (!r || !g) { host.innerHTML = ''; return; }

  // chronologique (ancien → récent), 12 derniers points
  const pts = _obsResidentObs(r.id, g.id).slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-12);

  const head = `
    <div class="dc-head">
      <span class="dc-chip" style="background:color-mix(in srgb, ${g.c} 16%, transparent);color:${g.c}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
      </span>
      <div>
        <div class="dc-eyebrow">Tendance</div>
        <div class="dc-title">${_obsEsc(g.nom)} — évolution du score</div>
      </div>
    </div>`;

  if (pts.length < 1) {
    host.innerHTML = head + `<div class="obs-empty">Aucun relevé pour cette grille. Cliquez sur « Nouvelle observation ».</div>`;
    return;
  }

  const W = 640, H = 200, PL = 34, PR = 14, PT = 14, PB = 26;
  const max = obsMaxScore(g);
  const iw = W - PL - PR, ih = H - PT - PB;
  const n = pts.length;
  const x = i => PL + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
  const y = v => PT + ih - (ih * v) / (max || 1);

  // bandes de seuil (fond)
  const bands = g.seuils.map(s => {
    const col = { green: '#16a34a', amber: '#f59e0b', red: '#ef4444', gray: '#94a3b8' }[s.tone] || '#94a3b8';
    const yTop = y(Math.min(s.max, max)), yBot = y(s.min);
    return `<rect x="${PL}" y="${yTop.toFixed(1)}" width="${iw}" height="${(yBot - yTop).toFixed(1)}" fill="${col}" opacity=".07"/>`;
  }).join('');

  const line = pts.map((o, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(o.total).toFixed(1)}`).join(' ');
  const area = `M${x(0).toFixed(1)} ${y(0).toFixed(1)} ` +
    pts.map((o, i) => `L${x(i).toFixed(1)} ${y(o.total).toFixed(1)}`).join(' ') +
    ` L${x(n - 1).toFixed(1)} ${y(0).toFixed(1)} Z`;

  const dots = pts.map((o, i) => {
    const t = obsInterpret(g, o.total).tone;
    const col = { green: '#16a34a', amber: '#f59e0b', red: '#ef4444', gray: '#94a3b8' }[t] || g.c;
    return `<circle cx="${x(i).toFixed(1)}" cy="${y(o.total).toFixed(1)}" r="4" fill="#fff" stroke="${col}" stroke-width="2.5"><title>${_obsEsc(_obsDateLong(o.date))} · ${o.total}/${max}</title></circle>`;
  }).join('');

  const xlabels = pts.map((o, i) =>
    (n <= 8 || i % 2 === 0)
      ? `<text x="${x(i).toFixed(1)}" y="${H - 8}" class="obs-ax" text-anchor="middle">${_obsDateShort(o.date)}</text>`
      : '').join('');

  const yTicks = [0, max].map(v =>
    `<text x="${PL - 8}" y="${(y(v) + 4).toFixed(1)}" class="obs-ax" text-anchor="end">${v}</text>`).join('');

  host.innerHTML = head + `
    <div class="obs-chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" class="obs-chart" preserveAspectRatio="none">
        ${bands}
        <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${PT + ih}" class="obs-axis"/>
        <line x1="${PL}" y1="${PT + ih}" x2="${PL + iw}" y2="${PT + ih}" class="obs-axis"/>
        ${yTicks}${xlabels}
        <path d="${area}" fill="${g.c}" opacity=".10"/>
        <path d="${line}" fill="none" stroke="${g.c}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}
      </svg>
    </div>
    <div class="obs-legend">${g.seuils.map(s =>
      `<span class="obs-lg dc-b-${s.tone}">${_obsEsc(s.niveau)}</span>`).join('')}</div>`;
}

// Historique des relevés (grille active).
function _obsRenderHistory() {
  const host = document.getElementById('obsHistory');
  if (!host) return;
  const r = _obsCurrentResident();
  const g = obsGrille(_obsGrilleId);
  if (!r) { host.innerHTML = ''; return; }

  const list = _obsResidentObs(r.id, _obsGrilleId).slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const head = `
    <div class="dc-head">
      <span class="dc-chip" style="background:color-mix(in srgb, ${g.c} 16%, transparent);color:${g.c}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 3v18"/></svg>
      </span>
      <div>
        <div class="dc-eyebrow">Historique</div>
        <div class="dc-title">Relevés · ${_obsEsc(g.nom)}</div>
      </div>
      <span class="dc-pill dim" style="margin-left:auto">${list.length}</span>
    </div>`;

  if (!list.length) {
    host.innerHTML = head + `<div class="obs-empty">Aucun relevé enregistré.</div>`;
    return;
  }

  const max = obsMaxScore(g);
  host.innerHTML = head + `<div class="obs-hist">` + list.map(o => {
    const inter = obsInterpret(g, o.total);
    const items = g.items.map(it => {
      const v = Number(o.scores?.[it.k]) || 0;
      if (!v) return '';
      return `<span class="obs-hi-tag">${_obsEsc(it.l)}${g.echelle === 'binaire' ? '' : ' ' + v}</span>`;
    }).filter(Boolean).join('');
    return `
      <div class="obs-hi">
        <div class="obs-hi-date">
          <span class="obs-hi-d">${_obsDateShort(o.date)}</span>
          <span class="obs-hi-y">${(o.date || '').slice(0, 4)}</span>
        </div>
        <div class="obs-hi-body">
          <div class="obs-hi-top">
            <span class="obs-hi-score dc-b-${inter.tone}">${o.total}/${max} · ${_obsEsc(inter.niveau)}</span>
            ${o.observateur ? `<span class="obs-hi-obs">${_obsEsc(o.observateur)}</span>` : ''}
          </div>
          ${items ? `<div class="obs-hi-tags">${items}</div>` : ''}
          ${o.notes ? `<div class="obs-hi-note">${_obsEsc(o.notes)}</div>` : ''}
        </div>
        ${(typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin()) ? `<button type="button" class="obs-hi-del" title="Supprimer" onclick="obsDelete('${o.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
        </button>` : ''}
      </div>`;
  }).join('') + `</div>`;
}

async function obsDelete(id) {
  // Relevé clinique : la suppression est réservée aux administrateurs (le
  // bouton est masqué pour les autres — ceci couvre l'appel direct).
  if (typeof Auth === 'undefined' || !Auth.isAdmin || !Auth.isAdmin()) {
    if (typeof showToast === 'function') showToast('Suppression réservée aux administrateurs', 'error');
    return;
  }
  if (!confirm('Supprimer ce relevé ?')) return;
  try {
    await sbDeleteObservation(id);
    _obsAll = _obsAll.filter(o => String(o.id) !== String(id));
    if (typeof showToast === 'function') showToast('Relevé supprimé', 'success');
    obsRender();
  } catch (e) {
    console.error(e);
    if (typeof showToast === 'function') showToast('Suppression impossible', 'error');
  }
}

// ── Modale de saisie ───────────────────────────────────────────────────────
let _obsDraftGrille = 'douleur';
let _obsDraftScores = {};

function obsOpenModal(residentId) {
  const rid = residentId || _obsResidentId;
  if (!rid) { if (typeof showToast === 'function') showToast('Ajoutez d\'abord un résident', 'error'); return; }
  _obsDraftGrille = _obsGrilleId && _obsGrilleId !== 'all' ? _obsGrilleId : 'douleur';
  _obsDraftScores = {};
  const r = _obsResidents.find(x => String(x.id) === String(rid));
  document.getElementById('obsMdResident').value = rid;
  document.getElementById('obsMdWho').textContent = _obsResName(r) || '—';
  const today = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;
  document.getElementById('obsMdDate').value = today;
  document.getElementById('obsMdNotes').value = '';
  _obsRenderGrilleTabs();
  _obsRenderGrilleForm();
  if (typeof openModal === 'function') openModal('obsModal');
  else document.getElementById('obsModal')?.classList.add('on');
}

function obsCloseModal() {
  if (typeof closeModal === 'function') closeModal('obsModal');
  else document.getElementById('obsModal')?.classList.remove('on');
}

function _obsRenderGrilleTabs() {
  const host = document.getElementById('obsMdTabs');
  if (!host) return;
  host.innerHTML = OBS_GRILLES.map(g =>
    `<button type="button" class="obs-gt${g.id === _obsDraftGrille ? ' on' : ''}"
       style="--gc:${g.c}" onclick="obsSwitchGrille('${g.id}')">${_obsEsc(g.nom)}</button>`).join('');
}

function obsSwitchGrille(id) {
  _obsDraftGrille = id;
  _obsDraftScores = {};
  _obsRenderGrilleTabs();
  _obsRenderGrilleForm();
}

function _obsSetScore(k, v) {
  _obsDraftScores[k] = v;
  _obsRenderGrilleForm();
}

function _obsRenderGrilleForm() {
  const host = document.getElementById('obsMdForm');
  const g = obsGrille(_obsDraftGrille);
  if (!host || !g) return;

  const rows = g.items.map(it => {
    const cur = _obsDraftScores[it.k];
    let ctrl;
    if (g.echelle === 'binaire') {
      ctrl = `<div class="obs-seg">
        <button type="button" class="obs-sb${cur === 0 ? ' on no' : ''}" onclick="_obsSetScore('${it.k}',0)">Non</button>
        <button type="button" class="obs-sb${cur === 1 ? ' on yes' : ''}" onclick="_obsSetScore('${it.k}',1)">Oui</button>
      </div>`;
    } else {
      ctrl = `<div class="obs-seg">` + [0, 1, 2, 3].map(v =>
        `<button type="button" class="obs-sb lv${v}${cur === v ? ' on' : ''}" onclick="_obsSetScore('${it.k}',${v})">${v}</button>`).join('') + `</div>`;
    }
    return `
      <div class="obs-it">
        <div class="obs-it-l">
          <span class="obs-it-lbl">${_obsEsc(it.l)}</span>
          ${it.d ? `<span class="obs-it-d">${_obsEsc(it.d)}</span>` : ''}
        </div>
        ${ctrl}
      </div>`;
  }).join('');

  const total = obsTotal(g, _obsDraftScores);
  const inter = obsInterpret(g, total);
  const max = obsMaxScore(g);

  host.innerHTML = `
    <div class="obs-aide">${_obsEsc(g.aide)}</div>
    <div class="obs-items">${rows}</div>
    <div class="obs-total dc-b-${inter.tone}">
      <span class="obs-total-l">Score</span>
      <span class="obs-total-v">${total}<span class="obs-total-d">/${max}</span></span>
      <span class="obs-total-n">${_obsEsc(inter.niveau)}</span>
    </div>`;
}

async function obsSave() {
  const g = obsGrille(_obsDraftGrille);
  if (!g) return;
  const rid = document.getElementById('obsMdResident').value;
  // Tous les items doivent être cotés.
  const missing = g.items.some(it => _obsDraftScores[it.k] == null);
  if (missing) { if (typeof showToast === 'function') showToast('Cotez tous les items avant d\'enregistrer', 'error'); return; }

  const nom = `${_obsSession.prenom || ''} ${_obsSession.nom || ''}`.trim() || _obsSession.username || '';
  const rec = {
    residentId: rid,
    grille: g.id,
    date: document.getElementById('obsMdDate').value || today(),
    scores: { ..._obsDraftScores },
    observateur: nom,
    observateurId: String(_obsSession.userId || ''),
    notes: document.getElementById('obsMdNotes').value.trim()
  };
  const btn = document.getElementById('obsMdSave');
  if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement…'; }
  try {
    const saved = await sbSaveObservation(rec);
    _obsAll.unshift(saved);
    _obsGrilleId = g.id;
    if (typeof showToast === 'function') showToast('Observation enregistrée', 'success');
    obsCloseModal();
    obsRender();
  } catch (e) {
    console.error(e);
    if (typeof showToast === 'function') showToast('Enregistrement impossible', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer'; }
  }
}

document.addEventListener('DOMContentLoaded', obsInit);
