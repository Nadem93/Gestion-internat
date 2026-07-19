const PS_KEY = DB.keys.planSoins;

const PS_FREQS = [
  { id:'quotidien',  label:'Quotidien',    short:'J' },
  { id:'matin',      label:'Matin',        short:'M' },
  { id:'midi',       label:'Midi',         short:'Mi' },
  { id:'soir',       label:'Soir',         short:'S' },
  { id:'nuit',       label:'Nuit',         short:'N' },
  { id:'semaine',    label:'Hebdomadaire', short:'H' },
  { id:'mensuel',    label:'Mensuel',      short:'Mo' },
  { id:'si_besoin',  label:'Si besoin',    short:'SB' }
];

const PS_CATS = [
  { id:'hygiene',      label:'Hygiène corporelle',   color:'#0ea5e9', icon:'🚿' },
  { id:'medication',   label:'Médicaments',          color:'#ef4444', icon:'💊' },
  { id:'mobilite',     label:'Mobilité & posture',   color:'#f97316', icon:'🦽' },
  { id:'alimentation', label:'Alimentation & repas', color:'#f59e0b', icon:'🍽️' },
  { id:'soins_infirm', label:'Soins infirmiers',     color:'#8b5cf6', icon:'🩺' },
  { id:'psy',          label:'Accompagnement psy',   color:'#6366f1', icon:'🧠' },
  { id:'social',       label:'Accompagnement social',color:'#10b981', icon:'🤝' },
  { id:'autre',        label:'Autre',                color:'#64748b', icon:'📋' }
];

// Source = Supabase. Cache mémoire chargé au démarrage.
let _psCache = [];
function getPs()       { return _psCache; }
async function loadPsCache() { _psCache = await sbGetPlanSoins(); }

// ── Coches « fait » (traçabilité : qui, à quelle heure, historique par jour) ──
let _psCoches = {};              // { soinId : coche } pour la date affichée (_psDate)
let _psCochesLoaded = false;
let _psDate = _psToday();        // date affichée (checklist du jour ou historique passé)
function _psUser() {
  const s = (typeof Auth !== 'undefined' && Auth.getSession) ? Auth.getSession() : null;
  return s ? { id: String(s.userId || ''), nom: [s.prenom, s.nom].filter(Boolean).join(' ') || s.username || '' } : { id: '', nom: '' };
}
async function _psLoadCoches() {
  try {
    const list = (typeof sbGetPsCoches === 'function') ? await sbGetPsCoches(_psDate || _psToday()) : [];
    _psCoches = {}; list.forEach(c => { _psCoches[String(c.soinId)] = c; });
  } catch (e) { console.error('[_psLoadCoches]', e); _psCoches = {}; }
  _psCochesLoaded = true;
}
function _psCocheTime(c) {
  if (!c || !c.doneAt) return '';
  try { return ' · ' + new Date(c.doneAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
}

function _psCat(id)    { return PS_CATS.find(c => c.id === id) || PS_CATS[7]; }
function _psFreq(id)   { return PS_FREQS.find(f => f.id === id) || PS_FREQS[0]; }

let _psResidentId = '';
let _psEditId     = '';

async function initPlanSoins() {
  const s = Auth.requireAuth();
  if (!s) return;
  await sbLoadResidentsCache();
  await loadPsCache();
  _psDate = _psToday();
  await _psLoadCoches();
  _populatePsResidents();
  const params = new URLSearchParams(window.location.search);
  const rid = params.get('residentId') || params.get('id');
  if (rid) {
    _psResidentId = rid;
    const sel = document.getElementById('psResident');
    if (sel) sel.value = rid;
  }
  document.getElementById('psResident')?.addEventListener('change', e => {
    _psResidentId = e.target.value;
    renderPlanSoins();
  });
  document.getElementById('psFilterCat')?.addEventListener('change', renderPlanSoins);
  renderPlanSoins();
}

function _populatePsResidents() {
  const residents = sbResidents();
  ['psResident','psModalResident'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const allOpt = id === 'psResident' ? '<option value="">Tous les résidents</option>' : '<option value="">— Choisir —</option>';
    el.innerHTML = allOpt + residents.map(r =>
      `<option value="${r.id}">${escHtml((r.prenom||'') + ' ' + (r.nom||''))}</option>`
    ).join('');
    if (_psResidentId) el.value = _psResidentId;
  });
}

// Injecte le CSS des fiches depuis le JS (solidaire du rendu, cache-proof).
function ensurePsUI() {
  if (typeof document === 'undefined' || document.getElementById('ps-card-styles')) return;
  const s = document.createElement('style');
  s.id = 'ps-card-styles';
  s.textContent = `
    .ps-res{background:#fff;border-radius:14px;border:1px solid #e2e8f0;padding:1rem 1.15rem 1.15rem;margin-bottom:1.25rem}
    .ps-res-head{display:flex;align-items:center;gap:.6rem;margin-bottom:1rem}
    .ps-res-ava{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.8rem;color:#fff;flex-shrink:0}
    .ps-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.85rem}
    .ps-card{position:relative;background:#fff;border:1px solid #e2e8f0;border-top:3px solid var(--cc,#64748b);border-radius:0 0 14px 14px;padding:.8rem .9rem;display:flex;flex-direction:column;transition:box-shadow .15s,transform .15s}
    .ps-card:hover{box-shadow:0 8px 22px rgba(15,43,74,.09);transform:translateY(-2px)}
    .ps-card.susp{opacity:.6}
    .ps-card.done{border-color:#bbf7d0;border-top-color:#16a34a;background:#f6fef9}
    .ps-card-head{display:flex;align-items:flex-start;gap:.6rem;margin-bottom:.5rem}
    .ps-card-ic{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.05rem;flex-shrink:0}
    .ps-card-t{font-size:.86rem;font-weight:700;color:#1e293b;line-height:1.25}
    .ps-card-freq{font-size:.63rem;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;font-weight:800;margin-top:2px}
    .ps-card-d{font-size:.74rem;color:#64748b;line-height:1.5;margin-bottom:.6rem}
    .ps-card-foot{display:flex;align-items:center;gap:.5rem;margin-top:auto;padding-top:.55rem;border-top:0.5px solid #eef2f7}
    .ps-who2{display:inline-flex;align-items:center;gap:.35rem;font-size:.7rem;color:#475569;min-width:0}
    .ps-av2{width:20px;height:20px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:.58rem;font-weight:800;flex-shrink:0}
    .ps-susp-tag2{font-size:.66rem;background:#f1f5f9;color:#94a3b8;padding:1px 8px;border-radius:999px;margin-left:auto}
    .ps-fait{margin-left:auto;display:inline-flex;align-items:center;gap:.35rem;border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:.22rem .6rem;font-size:.7rem;font-weight:700;color:#64748b;cursor:pointer;flex-shrink:0;transition:all .12s;font-family:inherit}
    .ps-fait:hover{border-color:#16a34a;color:#15803d}
    .ps-fait .ck{width:14px;height:14px;border-radius:50%;border:1.5px solid #cbd5e1;display:flex;align-items:center;justify-content:center;font-size:.58rem;line-height:1}
    .ps-fait.on{border-color:#16a34a;background:#dcfce7;color:#15803d}
    .ps-fait.on .ck{background:#16a34a;border-color:#16a34a;color:#fff}
    .ps-card-acts{position:absolute;top:.5rem;right:.5rem;display:flex;gap:.15rem;opacity:0;transition:opacity .12s}
    .ps-card:hover .ps-card-acts{opacity:1}
    .ps-card-acts button{width:22px;height:22px;border:none;background:#f1f5f9;border-radius:6px;cursor:pointer;color:#94a3b8;font-size:.72rem;display:flex;align-items:center;justify-content:center;padding:0}
    .ps-card-acts button:hover{background:#e2e8f0;color:#334155}
    .ps-doneby{font-size:.66rem;color:#15803d;margin-top:.5rem;padding-top:.45rem;border-top:0.5px dashed #bbf7d0;display:flex;align-items:center;gap:.3rem;line-height:1.3}
    .ps-datebar{display:flex;align-items:center;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap}
    .ps-datebar-nav{width:32px;height:32px;border:1px solid var(--border);background:#fff;border-radius:9px;cursor:pointer;color:#475569;display:flex;align-items:center;justify-content:center;font-size:1rem;font-family:inherit;flex-shrink:0}
    .ps-datebar-nav:hover{background:#f1f5f9}
    .ps-datebar-lbl{font-weight:700;font-size:.9rem;color:#0f2b4a}
    .ps-datebar-today{font-size:.72rem;color:#0891b2;background:#ecfeff;border:1px solid #a5f3fc;border-radius:999px;padding:.25rem .7rem;cursor:pointer;font-weight:700;font-family:inherit}
    .ps-datebar-hist{font-size:.68rem;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:999px;padding:.2rem .6rem;font-weight:700}
    @media(max-width:768px){.ps-card-acts{opacity:1}.ps-card-head{padding-right:76px}}`;
  document.head.appendChild(s);
}
function _psToday() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function _psIntervInitiales(name) {
  if (!name) return '?';
  const base = String(name).replace(/\(.*$/, '').trim();   // retire un éventuel « (IDE) »
  const parts = base.split(/\s+/).filter(Boolean);
  return ((parts.map(w => w[0] || '').join('').slice(0, 2)) || base.slice(0, 2) || '?').toUpperCase();
}

function renderPlanSoins() {
  ensurePsUI();
  const container = document.getElementById('psList');
  if (!container) return;
  const filterCat = document.getElementById('psFilterCat')?.value || '';
  const residents = sbResidents();

  let list = getPs();
  if (_psResidentId) list = list.filter(p => p.residentId === _psResidentId);
  if (filterCat)     list = list.filter(p => p.cat === filterCat);

  // Stats
  document.getElementById('psStatTotal').textContent = list.length;
  document.getElementById('psStatActifs').textContent = list.filter(p => p.actif !== false).length;
  document.getElementById('psStatResidents').textContent = new Set(list.map(p => p.residentId).filter(Boolean)).size;

  if (!list.length) {
    container.innerHTML = `<div class="empty" style="padding:3rem">
      <div class="empty-icon">🩺</div>
      <p>${_psResidentId ? 'Aucun soin défini pour ce résident' : 'Aucun plan de soins'}</p>
      <button class="btn btn-outline btn-sm" onclick="openPsModal()">Ajouter un soin</button>
    </div>`;
    return;
  }

  // Grouper par résident puis par catégorie
  const byResident = {};
  list.forEach(p => {
    const key = p.residentId || '__general';
    if (!byResident[key]) byResident[key] = [];
    byResident[key].push(p);
  });

  _psRenderDateBar();
  const isTodayView = _psDate === _psToday();
  const faitWhen = isTodayView ? "aujourd'hui" : 'ce jour-là';

  container.innerHTML = Object.entries(byResident).map(([rid, soins]) => {
    const r = residents.find(x => x.id === rid);
    const resColor = safeColor(r?.color, '#0f2b4a');
    const resName  = r ? `${r.prenom||''} ${r.nom||''}`.trim() : 'Général';
    const initiales = (resName.split(' ').map(w=>w[0]||'').join('').slice(0,2)).toUpperCase();
    const nbActif = soins.filter(s=>s.actif!==false).length;
    const nbInterv = new Set(soins.map(s=>s.intervenant).filter(Boolean)).size;
    const nbFait = soins.filter(s => s.actif!==false && _psCoches[String(s.id)]).length;

    // Tri : soins actifs d'abord, puis dans l'ordre des moments (PS_FREQS)
    const fi = f => { const i = PS_FREQS.findIndex(x=>x.id===f); return i < 0 ? 99 : i; };
    const sorted = soins.slice().sort((a,b) =>
      ((a.actif!==false?0:1) - (b.actif!==false?0:1)) || (fi(a.freq) - fi(b.freq)));

    return `<div class="ps-res" style="border-color:${resColor}22">
      <div class="ps-res-head">
        <div class="ps-res-ava" style="background:${resColor}">${initiales}</div>
        <div style="min-width:0">
          <div style="font-weight:800;font-size:.95rem;color:${resColor}">${escHtml(resName)}</div>
          <div style="font-size:.72rem;color:var(--muted)">${nbActif} soin${nbActif>1?'s':''} actif${nbActif>1?'s':''}${nbInterv?` · ${nbInterv} intervenant${nbInterv>1?'s':''}`:''}${nbActif?` · <span style="color:#16a34a;font-weight:700">${nbFait}/${nbActif} fait${nbFait>1?'s':''} ${faitWhen}</span>`:''}</div>
        </div>
        <button class="btn btn-accent btn-sm" style="margin-left:auto" onclick="openPsModal('','${rid}')">+ Ajouter</button>
      </div>
      <div class="ps-grid">${sorted.map(s => _psCard(s)).join('')}</div>
    </div>`;
  }).join('');
}

// hideActions : masque ✎/⏸/✕ (ex. carte du tableau de bord — lecture + coche « fait »)
function _psCard(s, hideActions) {
  const cat = _psCat(s.cat);
  const freq = _psFreq(s.freq);
  const isActif = s.actif !== false;
  const coche = _psCoches[String(s.id)];
  const done = isActif && !!coche;
  const isTodayView = _psDate === _psToday();
  const ini = _psIntervInitiales(s.intervenant);
  return `<article class="ps-card${isActif ? '' : ' susp'}${done ? ' done' : ''}" style="--cc:${cat.color}">
    ${hideActions ? '' : `<div class="ps-card-acts">
      <button onclick="openPsModal('${s.id}')" title="Modifier">✎</button>
      <button onclick="togglePsActif('${s.id}')" title="${isActif ? 'Suspendre' : 'Réactiver'}">${isActif ? '⏸' : '▶'}</button>
      <button onclick="deletePs('${s.id}')" title="Supprimer" style="color:#dc2626">✕</button>
    </div>`}
    <div class="ps-card-head">
      <span class="ps-card-ic" style="background:${cat.color}1a;color:${cat.color}">${cat.icon}</span>
      <div style="min-width:0">
        <div class="ps-card-t">${escHtml(s.libelle||'—')}</div>
        <div class="ps-card-freq">${escHtml(freq.label)}</div>
      </div>
    </div>
    ${s.detail ? `<div class="ps-card-d">${escHtml(s.detail)}</div>` : ''}
    <div class="ps-card-foot">
      ${s.intervenant
        ? `<span class="ps-who2"><span class="ps-av2" style="background:${cat.color}">${escHtml(ini)}</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(s.intervenant)}</span></span>`
        : `<span class="ps-who2" style="color:#cbd5e1">Sans intervenant</span>`}
      ${!isActif
        ? `<span class="ps-susp-tag2">Suspendu</span>`
        : isTodayView
          ? `<button class="ps-fait${done ? ' on' : ''}" onclick="togglePsFait('${s.id}')" title="${done ? 'Fait — cliquer pour annuler' : 'Marquer comme fait'}"><span class="ck">${done ? '✓' : ''}</span>${done ? 'Fait' : 'Fait ?'}</button>`
          : done
            ? `<span class="ps-fait on" style="cursor:default"><span class="ck">✓</span>Fait</span>`
            : `<span class="ps-fait" style="cursor:default;opacity:.5"><span class="ck"></span>Non fait</span>`}
    </div>
    ${done ? `<div class="ps-doneby">✓ Fait par ${escHtml(coche.par || '?')}${_psCocheTime(coche)}</div>` : ''}
  </article>`;
}

// Coche « fait » du jour affiché — enregistre QUI et QUAND (table plan_soins_coches).
async function togglePsFait(id) {
  const s = _psCache.find(x => x.id === id);
  if (!s || s.actif === false) return;
  if (_psDate !== _psToday()) { toast('On ne coche que la journée en cours', 'info'); return; }
  const key = String(id);
  const wasDone = !!_psCoches[key];
  const u = _psUser();
  try {
    if (wasDone) { await sbClearPsCoche(id, _psDate); delete _psCoches[key]; }
    else { const c = await sbSetPsCoche({ soinId: id, date: _psDate, par: u.nom, parId: u.id }); _psCoches[key] = c; }
  } catch (e) { console.error('[togglePsFait]', e); toast('Erreur : ' + (e?.message || e), 'error'); return; }
  renderPlanSoins();
  // Si la carte « Plan de soins — référés » du tableau de bord est présente, on la rafraîchit aussi
  if (typeof renderPlanSoinsReferes === 'function') { try { renderPlanSoinsReferes(); } catch (e) {} }
}

// ── Barre de date / navigation historique (page Plan de soins) ──
function _psRenderDateBar() {
  const bar = document.getElementById('psDateBar');
  if (!bar) return;
  const t = _psToday();
  const isToday = _psDate === t;
  const lbl = new Date((_psDate || t) + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  bar.innerHTML = `<button class="ps-datebar-nav" onclick="psSetDate(-1)" title="Jour précédent" aria-label="Jour précédent">‹</button>
    <button class="ps-datebar-nav" onclick="psSetDate(1)" title="Jour suivant" aria-label="Jour suivant"${isToday ? ' disabled style="opacity:.4;cursor:default"' : ''}>›</button>
    <span class="ps-datebar-lbl">${escHtml(lbl)}</span>
    ${isToday ? '' : `<button class="ps-datebar-today" onclick="psGoToday()">Aujourd’hui</button><span class="ps-datebar-hist">Historique — lecture seule</span>`}`;
}
async function psSetDate(delta) {
  const d = new Date((_psDate || _psToday()) + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  const p = n => String(n).padStart(2, '0');
  const next = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  if (next > _psToday()) return;               // pas de navigation dans le futur
  _psDate = next;
  await _psLoadCoches();
  renderPlanSoins();
}
async function psGoToday() {
  _psDate = _psToday();
  await _psLoadCoches();
  renderPlanSoins();
}

function openPsModal(id, presetResidentId) {
  _psEditId = id || '';
  const list = getPs();
  const s = id ? list.find(x => x.id === id) : null;
  document.getElementById('psModalTitle').textContent = s ? 'Modifier le soin' : 'Nouveau soin';
  document.getElementById('psModalId').value = _psEditId;
  const rid = s?.residentId || presetResidentId || _psResidentId || '';
  document.getElementById('psModalResident').value = rid;
  document.getElementById('psModalCat').value = s?.cat || 'hygiene';
  document.getElementById('psModalFreq').value = s?.freq || 'quotidien';
  document.getElementById('psModalLibelle').value = s?.libelle || '';
  document.getElementById('psModalDetail').value = s?.detail || '';
  document.getElementById('psModalIntervenant').value = s?.intervenant || '';
  document.getElementById('psModalNote').value = s?.note || '';
  openModal('modalPlanSoins');
}

async function savePlanSoins() {
  const libelle = document.getElementById('psModalLibelle').value.trim();
  if (!libelle) { toast('Le libellé est obligatoire', 'error'); return; }
  const rid = document.getElementById('psModalResident').value;
  const list = getPs();
  const now = new Date().toISOString();
  const data = {
    residentId:   rid,
    cat:          document.getElementById('psModalCat').value,
    freq:         document.getElementById('psModalFreq').value,
    libelle,
    detail:       document.getElementById('psModalDetail').value.trim(),
    intervenant:  document.getElementById('psModalIntervenant').value.trim(),
    note:         document.getElementById('psModalNote').value.trim(),
    actif:        true
  };
  try {
    if (_psEditId) {
      const old = _psCache.find(x => x.id === _psEditId) || {};
      const saved = await sbSavePlanSoins({ ...old, ...data, id: _psEditId });
      _psCache = _psCache.map(x => x.id === _psEditId ? saved : x);
      toast('Soin modifié');
    } else {
      const saved = await sbSavePlanSoins(data);
      _psCache.unshift(saved);
      toast('Soin ajouté', 'success');
    }
  } catch (e) { console.error('[savePlanSoins]', e); toast('Erreur : ' + (e?.message || e), 'error'); return; }
  closeModal('modalPlanSoins');
  renderPlanSoins();
}

async function togglePsActif(id) {
  const s = _psCache.find(x => x.id === id);
  if (!s) return;
  const newActif = s.actif === false;
  try {
    const saved = await sbSavePlanSoins({ ...s, actif: newActif, id });
    _psCache = _psCache.map(x => x.id === id ? saved : x);
  } catch (e) { console.error('[togglePsActif]', e); toast('Erreur : ' + (e?.message || e), 'error'); return; }
  renderPlanSoins();
  toast(newActif ? 'Soin réactivé' : 'Soin suspendu');
}

function deletePs(id) {
  if (!confirm('Supprimer ce soin du plan ?')) return;
  (async () => {
    try {
      await sbDeletePlanSoins(id);
      _psCache = _psCache.filter(x => x.id !== id);
    } catch (e) { console.error('[deletePs]', e); toast('Erreur suppression : ' + (e?.message || e), 'error'); return; }
    renderPlanSoins();
    toast('Soin supprimé');
  })();
}

document.addEventListener('DOMContentLoaded', initPlanSoins);
if (typeof registerPageInit === 'function') registerPageInit('plan-soins', initPlanSoins);
