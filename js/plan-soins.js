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

function _psCat(id)    { return PS_CATS.find(c => c.id === id) || PS_CATS[7]; }
function _psFreq(id)   { return PS_FREQS.find(f => f.id === id) || PS_FREQS[0]; }

let _psResidentId = '';
let _psEditId     = '';

async function initPlanSoins() {
  const s = Auth.requireAuth();
  if (!s) return;
  await sbLoadResidentsCache();
  await loadPsCache();
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

// Injecte le CSS de la frise depuis le JS (solidaire du rendu, cache-proof).
function ensurePsUI() {
  if (typeof document === 'undefined' || document.getElementById('ps-frise-styles')) return;
  const s = document.createElement('style');
  s.id = 'ps-frise-styles';
  s.textContent = `
    .ps-res{background:#fff;border-radius:14px;border:1px solid #e2e8f0;padding:1rem 1.15rem 1.15rem;margin-bottom:1.25rem}
    .ps-res-head{display:flex;align-items:center;gap:.6rem;margin-bottom:1rem}
    .ps-res-ava{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.8rem;color:#fff;flex-shrink:0}
    .ps-frise{display:flex;flex-direction:column}
    .ps-rail{display:flex;gap:.85rem}
    .ps-rail-lbl{width:84px;flex-shrink:0;text-align:right;font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:#64748b;padding-top:.65rem}
    .ps-rail-body{flex:1;min-width:0;border-left:2px solid #e2e8f0;padding:0 0 .85rem 1.1rem;display:flex;flex-direction:column;gap:.5rem}
    .ps-rail:last-child .ps-rail-body{padding-bottom:.15rem}
    .ps-soin{position:relative;background:#f8fafc;border:0.5px solid #e2e8f0;border-left:3px solid var(--cc,#64748b);border-radius:0 10px 10px 0;padding:.55rem .7rem;display:flex;align-items:flex-start;gap:.55rem;transition:background .12s}
    .ps-soin:hover{background:#f1f5f9}
    .ps-soin::before{content:'';position:absolute;left:calc(-1.1rem - 6px);top:.7rem;width:10px;height:10px;border-radius:50%;background:var(--cc,#64748b);border:2px solid #fff}
    .ps-soin.susp{opacity:.55}
    .ps-soin-ic{font-size:1rem;line-height:1.2;flex-shrink:0}
    .ps-soin-body{flex:1;min-width:0}
    .ps-soin-t{font-size:.83rem;font-weight:700;color:#1e293b}
    .ps-soin-d{font-size:.72rem;color:#64748b;margin-top:1px;line-height:1.45}
    .ps-soin-meta{display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.35rem;align-items:center}
    .ps-cat{font-size:.66rem;padding:1px 7px;border-radius:999px;font-weight:600}
    .ps-who{font-size:.66rem;background:#e0f2fe;color:#0369a1;padding:1px 7px;border-radius:999px}
    .ps-susp-tag{font-size:.66rem;background:#f1f5f9;color:#94a3b8;padding:1px 7px;border-radius:999px}
    .ps-acts{display:flex;gap:.1rem;flex-shrink:0}
    .ps-acts button{width:24px;height:24px;border:none;background:none;border-radius:6px;cursor:pointer;color:#94a3b8;font-size:.8rem;display:flex;align-items:center;justify-content:center;padding:0}
    .ps-acts button:hover{background:#e2e8f0;color:#334155}`;
  document.head.appendChild(s);
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

  const h = new Date().getHours();
  const momentNow = h < 11 ? 'matin' : h < 14 ? 'midi' : h < 20 ? 'soir' : 'nuit';

  container.innerHTML = Object.entries(byResident).map(([rid, soins]) => {
    const r = residents.find(x => x.id === rid);
    const resColor = safeColor(r?.color, '#0f2b4a');
    const resName  = r ? `${r.prenom||''} ${r.nom||''}`.trim() : 'Général';
    const initiales = (resName.split(' ').map(w=>w[0]||'').join('').slice(0,2)).toUpperCase();
    const nbActif = soins.filter(s=>s.actif!==false).length;
    const nbInterv = new Set(soins.map(s=>s.intervenant).filter(Boolean)).size;

    // Frise : un rail par moment (fréquence), dans l'ordre PS_FREQS
    const rails = PS_FREQS.map(f => {
      const items = soins.filter(s => s.freq === f.id);
      if (!items.length) return '';
      const isNow = f.id === momentNow;
      return `<div class="ps-rail">
        <div class="ps-rail-lbl"${isNow ? ' style="color:#4f46e5"' : ''}>${escHtml(f.label)}${isNow ? ' <span style="color:#f59e0b" title="Moment en cours">●</span>' : ''}</div>
        <div class="ps-rail-body">${items.map(s => _psRow(s)).join('')}</div>
      </div>`;
    }).join('');

    return `<div class="ps-res" style="border-color:${resColor}22">
      <div class="ps-res-head">
        <div class="ps-res-ava" style="background:${resColor}">${initiales}</div>
        <div style="min-width:0">
          <div style="font-weight:800;font-size:.95rem;color:${resColor}">${escHtml(resName)}</div>
          <div style="font-size:.72rem;color:var(--muted)">${nbActif} soin${nbActif>1?'s':''} actif${nbActif>1?'s':''}${nbInterv?` · ${nbInterv} intervenant${nbInterv>1?'s':''}`:''}</div>
        </div>
        <button class="btn btn-accent btn-sm" style="margin-left:auto" onclick="openPsModal('','${rid}')">+ Ajouter</button>
      </div>
      <div class="ps-frise">${rails}</div>
    </div>`;
  }).join('');
}

function _psRow(s) {
  const cat = _psCat(s.cat);
  const isActif = s.actif !== false;
  return `<div class="ps-soin${isActif ? '' : ' susp'}" style="--cc:${cat.color}">
    <span class="ps-soin-ic">${cat.icon}</span>
    <div class="ps-soin-body">
      <div class="ps-soin-t">${escHtml(s.libelle||'—')}</div>
      ${s.detail ? `<div class="ps-soin-d">${escHtml(s.detail)}</div>` : ''}
      <div class="ps-soin-meta">
        <span class="ps-cat" style="background:${cat.color}18;color:${cat.color}">${escHtml(cat.label)}</span>
        ${s.intervenant ? `<span class="ps-who">${escHtml(s.intervenant)}</span>` : ''}
        ${!isActif ? '<span class="ps-susp-tag">Suspendu</span>' : ''}
      </div>
    </div>
    <div class="ps-acts">
      <button onclick="openPsModal('${s.id}')" title="Modifier">✎</button>
      <button onclick="togglePsActif('${s.id}')" title="${isActif ? 'Suspendre' : 'Réactiver'}">${isActif ? '⏸' : '▶'}</button>
      <button onclick="deletePs('${s.id}')" title="Supprimer" style="color:#dc2626">✕</button>
    </div>
  </div>`;
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
