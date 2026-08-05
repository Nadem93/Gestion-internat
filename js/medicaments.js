// ── TRAÇABILITÉ DE LA DISTRIBUTION DES MÉDICAMENTS ──

// Heure d'une distribution : accepte un horodatage ISO complet ou une heure « HH:MM »
function medHeure(h) { return !h ? '' : (String(h).includes('T') ? String(h).slice(11, 16) : String(h).slice(0, 5)); }
let medCanEdit = false;
let medNoteCtx = null;
let medSearch = '';
let medFilterPresent = false;

function medSetSearch(v) { medSearch = v.toLowerCase().trim(); renderMedicaments(); }
function medTogglePresent() { medFilterPresent = !medFilterPresent; renderMedicaments(); }

const MED_MOMENTS = {
  matin: { label: 'Matin', icon: '🌅' },
  midi: { label: 'Midi', icon: '☀️' },
  soir: { label: 'Soir', icon: '🌆' },
  coucher: { label: 'Coucher', icon: '🌙' }
};
// Heure au-delà de laquelle une prise non enregistrée est considérée en retard
// (même seuils que la génération d'alertes dans js/alertes.js)
const MED_HEURE_LIMITE = { matin: 11, midi: 14, soir: 20, coucher: 23 };
const MED_STATUTS = {
  donne:  { label: 'Donné',   icon: '✅', color: '#16a34a' },
  confie: { label: 'Confié',  icon: '🤝', color: '#2563eb' },
  refuse: { label: 'Refusé',  icon: '🚫', color: '#dc2626' },
  absent: { label: 'Absent',  icon: '➖', color: '#6b7280' },
  report: { label: 'Reporté', icon: '⏭️', color: '#d97706' }
};

// ── Décompte automatique du stock à la prise ──────────────────────────────
// Un stock relié à un traitement (stock_medicaments.traitement_id) est
// décrémenté quand la prise devient « consommée » — Donné ou Confié, car le
// médicament quitte alors le stock — et ré-incrémenté si elle quitte cet état
// (annulation, refus, absence…). Refusé/Absent/Reporté ne consomment rien.
// Best-effort : le décompte n'interrompt jamais le pointage.
const MED_STATUTS_CONSO = new Set(['donne', 'confie']);
function medStockDelta(prevStatut, newStatut) {
  const was = MED_STATUTS_CONSO.has(prevStatut);
  const now = MED_STATUTS_CONSO.has(newStatut);
  if (!was && now) return -1;   // devient consommée → retire 1 du stock
  if (was && !now) return +1;   // n'est plus consommée → remet 1
  return 0;                      // pas de changement de consommation (ex. donné→confié)
}
function medApplyStockDelta(residentId, traitementId, delta) {
  if (!delta || !traitementId) return;
  try {
    if (typeof stockMedList !== 'function') return;   // panneau stock absent de cette page
    const stock = stockMedList().find(s =>
      s.traitementId && String(s.traitementId) === String(traitementId)
      && String(s.residentId) === String(residentId));
    if (!stock) return;                               // aucun stock relié à ce traitement
    const before = Number(stock.quantite) || 0;
    const after = Math.max(0, before + delta);
    if (after === before) return;                     // déjà à 0, rien à retirer
    stock.quantite = after;                           // maj optimiste du cache (rendu immédiat)
    if (typeof sbSaveStockMed === 'function') {
      Promise.resolve(sbSaveStockMed(stock)).catch(e => console.warn('[stock-med] persistance décompte', e));
    }
  } catch (e) { console.warn('[stock-med] décompte auto ignoré', e); }
}

// ── Pilulier : bandelette d'actions ouverte (une seule à la fois) ──
let _medOpenChip = '';   // clé `${residentId}|${traitementId}|${moment}`
function medToggleChip(key) { _medOpenChip = _medOpenChip === key ? '' : key; renderMedicaments(); }
function medMomentCourant() {
  const h = new Date().getHours();
  return h < 11 ? 'matin' : h < 14 ? 'midi' : h < 20 ? 'soir' : 'coucher';
}

// Onglet de moment affiché (matin/midi/soir/coucher)
let _medMomentTab = '';
function medSetMomentTab(m) { _medMomentTab = m; renderMedicaments(); }

// Source = Supabase. Cache mémoire chargé au démarrage.
let _medCache = [];
function getMedDistrib() { return _medCache; }
async function loadMedCache() { _medCache = await sbGetMedDistrib(); }

function medResidents() {
  return sbResidents().filter(r => r.statut !== 'sorti')
    .sort((a, b) => `${a.nom || ''}`.localeCompare(`${b.nom || ''}`, 'fr'));
}

// Traitements avec moments de prise, actifs pour une date donnée
function medPrevues(date) {
  const out = [];
  medResidents().forEach(r => {
    const traitements = (r.sante?.traitements || []).filter(t =>
      (t.moments || []).length && (!t.debut || t.debut <= date) && (!t.fin || t.fin >= date));
    traitements.forEach(t => (t.moments || []).forEach(moment => {
      out.push({
        residentId: r.id, residentName: `${r.prenom || ''} ${r.nom || ''}`.trim(),
        traitementId: t.id, medicament: t.nom, posologie: t.posologie, moment
      });
    }));
  });
  return out;
}

function medRecord(date, residentId, traitementId, moment) {
  return getMedDistrib().find(x => x.date === date && String(x.residentId) === String(residentId) && x.traitementId === traitementId && x.moment === moment);
}

// ── File d'écriture unique (calquée sur la page présences) ──
// Les taps sont appliqués de façon optimiste au cache puis écrits en base
// dans l'ordre des gestes. En cas d'échec, on ne recharge la vérité serveur
// qu'une fois la file vidée, pour ne pas effacer les écritures en attente.
let _medWriteChain = Promise.resolve();
let _medPendingWrites = 0, _medWriteFailed = false;
function medQueueWrite(fn) {
  _medPendingWrites++;
  _medWriteChain = _medWriteChain.then(async () => {
    try { await fn(); }
    catch (e) { console.error('[medQueueWrite]', e); _medWriteFailed = true; toast('Erreur lors de l\'enregistrement', 'error'); }
    finally {
      _medPendingWrites--;
      if (!_medPendingWrites && _medWriteFailed) { _medWriteFailed = false; await loadMedCache(); renderMedicaments(); }
    }
  });
  return _medWriteChain;
}

// ── Tuile (façon page présences) : un tap = « Donné » (re-tap = annule) ;
// appui long (500 ms) ou bouton ✎ = modal détail (tous statuts + note). ──
let _medLpTimer = null, _medLpFired = false;
function medTileDown(ev, date, residentId, traitementId, moment) {
  if (ev && ev.button > 0) return; // clic droit : géré par contextmenu
  _medLpFired = false;
  clearTimeout(_medLpTimer);
  _medLpTimer = setTimeout(() => { _medLpFired = true; medOpenDetail(date, residentId, traitementId, moment); }, 500);
}
function medTileUp() { clearTimeout(_medLpTimer); }
function medTileClick(date, residentId, traitementId, moment) {
  if (!medCanEdit) return;
  if (_medLpFired) { _medLpFired = false; return; } // l'appui long a déjà ouvert le détail
  setMedStatut(date, residentId, traitementId, moment, 'donne');
}
function medTileKey(date, residentId, traitementId, moment) {
  _medLpFired = false; clearTimeout(_medLpTimer);
  setMedStatut(date, residentId, traitementId, moment, 'donne');
}

// ── Modal détail d'une prise : choix du statut + observation ──
let _mdCtx = null, _mdSel = '';
function medOpenDetail(date, residentId, traitementId, moment) {
  if (!medCanEdit) return;
  clearTimeout(_medLpTimer);
  const rec = medRecord(date, residentId, traitementId, moment);
  const prevue = medPrevues(date).find(p => String(p.residentId) === String(residentId) && p.traitementId === traitementId && p.moment === moment);
  if (!rec && !prevue) return;
  _mdCtx = { date, residentId, traitementId, moment };
  _mdSel = rec?.statut || '';
  const med = prevue?.medicament || rec?.medicament || '';
  const poso = prevue?.posologie || rec?.posologie || '';
  document.getElementById('mdTitle').textContent = prevue?.residentName || rec?.residentName || '';
  document.getElementById('mdSub').textContent = `${med}${poso ? ' · ' + poso : ''} — ${MED_MOMENTS[moment]?.label || moment}`;
  document.getElementById('mdNote').value = rec?.observation || '';
  medRenderDetailSeg();
  openModal('modalMedDetail');
}
function medRenderDetailSeg() {
  document.getElementById('mdSeg').innerHTML = Object.entries(MED_STATUTS).map(([k, v]) => {
    const on = _mdSel === k;
    return `<button type="button" aria-pressed="${on}" onclick="medPickDetail('${k}')" style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:.55rem .25rem;border-radius:10px;border:1.5px solid;cursor:pointer;font-family:inherit;transition:all .15s;${on ? `background:${v.color};color:#fff;border-color:${v.color}` : `background:${v.color}12;color:${v.color};border-color:${v.color}55`}">
      <span style="font-size:1rem;line-height:1">${v.icon}</span>
      <span style="font-size:.62rem;font-weight:700;line-height:1">${v.label}</span>
    </button>`;
  }).join('');
}
function medPickDetail(k) { _mdSel = (_mdSel === k ? '' : k); medRenderDetailSeg(); }
function medDetailReset() { _mdSel = ''; medRenderDetailSeg(); }
async function medSaveDetail() {
  if (!_mdCtx) return;
  const { date, residentId, traitementId, moment } = _mdCtx;
  const statut = _mdSel;
  const observation = document.getElementById('mdNote').value.trim();
  closeModal('modalMedDetail');
  const list = getMedDistrib();
  const keyMatch = x => x.date === date && String(x.residentId) === String(residentId) && x.traitementId === traitementId && x.moment === moment;
  const i = list.findIndex(keyMatch);
  const _prevStatut = i >= 0 ? list[i].statut : '';   // statut AVANT cette validation (décompte stock)
  const prevue = medPrevues(date).find(p => String(p.residentId) === String(residentId) && p.traitementId === traitementId && p.moment === moment);
  const session = Auth.getSession();
  const auteur = [session?.prenom, session?.nom].filter(Boolean).join(' ') || session?.username || '';

  // Optimiste + file (même modèle que setMedStatut). Statut vide + note vide = réinitialise.
  let rec, op;
  if (!statut && !observation) {
    if (i < 0) return;
    rec = list[i]; op = 'delete'; list.splice(i, 1);
  } else if (i >= 0) {
    rec = list[i]; op = 'save';
    rec.statut = statut; rec.observation = observation;
    if (statut) { rec.heure = new Date().toISOString(); rec.auteur = auteur; }
  } else if (prevue) {
    rec = { date, residentId, residentName: prevue.residentName, traitementId, medicament: prevue.medicament, posologie: prevue.posologie, moment, statut, heure: statut ? new Date().toISOString() : '', auteur, observation };
    op = 'save'; list.push(rec);
  } else { return; }
  medApplyStockDelta(residentId, traitementId, medStockDelta(_prevStatut, op === 'delete' ? '' : statut));
  renderMedicaments();
  if (typeof auditLog === 'function' && prevue && statut) auditLog('med_distrib', `${prevue.medicament} (${MED_MOMENTS[moment]?.label || moment}) — ${prevue.residentName} → ${MED_STATUTS[statut]?.label || statut}`);
  await medQueueWrite(async () => {
    if (op === 'delete') { if (rec.id) await sbDeleteMedDistrib(rec.id); }
    else { const saved = await sbSaveMedDistrib(rec); Object.assign(rec, saved); }
  });
}

// Injecte le CSS des tuiles + le modal détail depuis le JS : ils restent
// ainsi solidaires du rendu même si le HTML de la page est servi depuis un
// cache plus ancien (service worker). Idempotent.
function ensureMedUI() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('med-tiles-styles')) {
    const s = document.createElement('style');
    s.id = 'med-tiles-styles';
    s.textContent = `
    .med-tabs{display:flex;gap:5px;margin:0 0 14px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:5px}
    .med-tab{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 4px;border-radius:10px;border:none;background:none;cursor:pointer;font-family:inherit;color:#64748b;transition:background .15s,color .15s}
    .med-tab:hover{background:#f1f5f9}
    .med-tab.active{background:#4f46e5;color:#fff}
    .med-tab-lbl{font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
    .med-tab-count{font-size:10.5px;font-weight:600;opacity:.85}
    .med-tab-now{color:#f59e0b;font-size:9px;vertical-align:middle}
    .med-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
    .mtile{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:14px 8px 9px;border-radius:16px;border:2px solid var(--rg);background:var(--bg);cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:manipulation;text-align:center;transition:transform .12s,box-shadow .12s,border-color .15s,background .15s}
    .mtile:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(15,43,74,.10)}
    .mtile:active{transform:scale(.97)}
    .mtile:focus-visible{outline:3px solid #0ea5e9;outline-offset:2px}
    .mtile-ava{width:52px;height:52px;border-radius:50%;object-fit:cover;border:3px solid var(--st);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px;flex-shrink:0}
    .mtile-badge{position:absolute;top:8px;right:10px;width:22px;height:22px;border-radius:50%;background:var(--st);color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #fff}
    .mtile-alert{position:absolute;top:8px;left:10px;min-width:20px;height:20px;padding:0 3px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;border:2px solid #fff}
    .mtile-nom{font-weight:700;font-size:13px;color:#1e293b;margin-top:6px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mtile-med{font-size:11px;color:#64748b;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mtile-foot{display:flex;align-items:center;gap:5px;margin-top:8px;max-width:100%}
    .mtile-pill{font-size:11px;font-weight:800;color:var(--st);background:#fff;border:1px solid var(--rg);border-radius:999px;padding:2px 9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
    .mtile-edit{width:22px;height:22px;border-radius:50%;border:1px solid #e2e8f0;background:#fff;color:#64748b;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0}
    .mtile-edit:hover{background:#f1f5f9;color:#1e293b}
    .mtile-note{font-size:11px;color:#64748b;background:#fff;border:1px dashed var(--rg);border-radius:8px;padding:2px 7px;margin-top:6px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`;
    document.head.appendChild(s);
  }
  if (!document.getElementById('modalMedDetail')) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="modal-overlay" id="modalMedDetail">
  <div class="modal" style="max-width:440px">
    <div class="modal-header">
      <div>
        <span class="modal-title" id="mdTitle">Prise</span>
        <div id="mdSub" style="font-size:.72rem;color:var(--muted);margin-top:2px;font-weight:400">—</div>
      </div>
      <button class="modal-close" onclick="closeModal('modalMedDetail')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body">
      <div>
        <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;color:#64748b;font-weight:700;margin-bottom:.5rem">Statut</div>
        <div id="mdSeg" style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem"></div>
      </div>
      <div class="form-group"><label>Observation (motif de refus, remarque…)</label><textarea id="mdNote" rows="3" placeholder="Ex : médicament refusé, résident absent, prise reportée au soir…"></textarea></div>
    </div>
    <div class="modal-footer" style="justify-content:space-between">
      <button class="btn btn-ghost btn-sm" style="color:#dc2626" onclick="medDetailReset()">Réinitialiser</button>
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-ghost" onclick="closeModal('modalMedDetail')">Annuler</button>
        <button class="btn btn-primary" onclick="medSaveDetail()">💾 Enregistrer</button>
      </div>
    </div>
  </div>
</div>`;
    if (wrap.firstElementChild) document.body.appendChild(wrap.firstElementChild);
  }
}

// ── RENDU PRINCIPAL ──
function renderMedicaments() {
  // Design V2 : le rendu est repris par js/medicaments-v2.js (med2Render).
  // Tous les appelants existants (init, changement de date, écritures…)
  // continuent d'appeler renderMedicaments().
  if (typeof med2Render === 'function') { med2Render(); return; }
  ensureMedUI();
  const date = document.getElementById('medDate').value || today();
  const prevues = medPrevues(date);
  const records = getMedDistrib();
  const enriched = prevues.map(p => ({ ...p, record: records.find(x => x.date === date && String(x.residentId) === String(p.residentId) && x.traitementId === p.traitementId && x.moment === p.moment) }));

  const nbDonne    = enriched.filter(e => e.record?.statut === 'donne').length;
  const nbIncident = enriched.filter(e => e.record?.statut && ['refuse','absent','report'].includes(e.record.statut)).length;
  const nbAttente  = enriched.filter(e => !e.record?.statut).length;

  document.getElementById('medStats').innerHTML = `
    <div class="chx-stat" style="--c:#2563eb"><div class="chx-stat-top"><span class="chx-stat-lbl">Prises prévues</span></div><div class="chx-stat-num">${enriched.length}</div></div>
    <div class="chx-stat" style="--c:#16a34a"><div class="chx-stat-top"><span class="chx-stat-lbl">Données</span></div><div class="chx-stat-num">${nbDonne}</div></div>
    <div class="chx-stat" style="--c:#dc2626"><div class="chx-stat-top"><span class="chx-stat-lbl">Refus / absences / reports</span></div><div class="chx-stat-num">${nbIncident}</div></div>
    <div class="chx-stat" style="--c:#d97706"><div class="chx-stat-top"><span class="chx-stat-lbl">En attente</span></div><div class="chx-stat-num">${nbAttente}</div></div>`;

  const el = document.getElementById('medList');
  if (!enriched.length) {
    el.innerHTML = `<div style="background:rgba(255,255,255,.9);border-radius:18px;padding:2.5rem;text-align:center">
      <div style="font-size:2rem;margin-bottom:.75rem">💊</div>
      <div style="font-weight:700;font-size:1rem;color:#1e293b;margin-bottom:.4rem">Aucun traitement à distribuer</div>
      <div style="font-size:.83rem;color:#64748b">Renseignez les moments de prise depuis la fiche médicale de chaque résident.</div>
    </div>`;
    return;
  }

  const residents = sbResidents();
  const resMap = {};
  residents.forEach(r => { resMap[String(r.id)] = r; });

  const presencesAujourdhui = (DB.get(DB.keys.presences) || {})[date] || {};

  el.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
    <div style="flex:1;min-width:180px;display:flex;align-items:center;gap:8px;background:#fff;border-radius:20px;padding:7px 14px;border:1.5px solid #e2e8f0">
      <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="width:15px;height:15px;flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="medSearchInput" type="text" placeholder="Rechercher un résident…" value="${escHtml(medSearch)}" oninput="medSetSearch(this.value)" style="border:none;outline:none;background:none;font-size:13px;color:#1e293b;width:100%;font-family:inherit"/>
    </div>
    <button onclick="medTogglePresent()" style="padding:7px 16px;border-radius:20px;border:1.5px solid ${medFilterPresent?'#16a34a':'#e2e8f0'};background:${medFilterPresent?'#f0fdf4':'#fff'};color:${medFilterPresent?'#16a34a':'#64748b'};font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px">
      <span style="width:8px;height:8px;border-radius:50%;background:${medFilterPresent?'#16a34a':'#cbd5e1'};display:inline-block"></span>
      Présents seulement
    </button>
  </div>
  ${medCanEdit ? `<div style="font-size:11.5px;color:#64748b;margin:-2px 0 12px;display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span aria-hidden="true">👆</span> Un tap sur une tuile = <b style="color:#16a34a">Donné</b> · re-tap = annule · ✎ ou appui long = plus d'options (confié, refusé, absent, reporté, note)</div>` : ''}
  <div id="medResidentList"></div>`;

  const listEl = document.getElementById('medResidentList');

  const momentOrder = Object.keys(MED_MOMENTS);
  const JOURS_MED = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  const jourMed = JOURS_MED[new Date(date + 'T00:00:00').getDay()];

  function isResidentPresent(residentId) {
    const manual = presencesAujourdhui[residentId];
    if (manual) return manual === 'present';
    const r = resMap[residentId];
    if ((typeof phDayAbsences === 'function' ? phDayAbsences(r?.planningHebdo?.[jourMed]) : []).length) return false;
    return true;
  }

  // Filtres : recherche par nom de résident + « présents seulement »
  let visibles = enriched;
  if (medSearch) visibles = visibles.filter(e => (e.residentName || '').toLowerCase().includes(medSearch));
  if (medFilterPresent) visibles = visibles.filter(e => isResidentPresent(e.residentId));

  if (!visibles.length) {
    listEl.innerHTML = `<div style="background:rgba(255,255,255,.85);border-radius:16px;padding:2rem;text-align:center;font-size:13px;color:#64748b;font-style:italic">Aucune prise correspondant aux filtres.</div>`;
    return;
  }

  const momentNow = (date === today()) ? medMomentCourant() : null;
  const nowH = new Date().getHours();

  // Thème couleur d'une tuile selon le statut (ou le retard si non renseigné)
  const TILE_THEME = {
    donne:  { st:'#16a34a', rg:'#bbf7d0', bg:'#f0fdf4' },
    confie: { st:'#2563eb', rg:'#bfdbfe', bg:'#eff6ff' },
    refuse: { st:'#dc2626', rg:'#fecaca', bg:'#fef2f2' },
    absent: { st:'#6b7280', rg:'#e5e7eb', bg:'#f9fafb' },
    report: { st:'#d97706', rg:'#fde68a', bg:'#fffbeb' },
  };
  const themeFor = (statut, enRetard) => TILE_THEME[statut] || (enRetard ? { st:'#dc2626', rg:'#fecaca', bg:'#fef2f2' } : { st:'#94a3b8', rg:'#e2e8f0', bg:'#ffffff' });

  // Onglets Matin / Midi / Soir / Coucher — on n'affiche que le moment actif
  if (!momentOrder.includes(_medMomentTab)) _medMomentTab = momentNow || momentOrder[0];

  const byMoment = {};
  momentOrder.forEach(m => {
    byMoment[m] = visibles.filter(e => e.moment === m)
      .sort((a, b) => (a.residentName || '').localeCompare(b.residentName || '', 'fr'));
  });

  const tabsHtml = momentOrder.map(m => {
    const its = byMoment[m];
    const mom = MED_MOMENTS[m];
    const done = its.filter(e => e.record?.statut === 'donne').length;
    const active = _medMomentTab === m;
    const isNow = momentNow === m;
    return `<button type="button" class="med-tab${active ? ' active' : ''}" aria-pressed="${active}" onclick="medSetMomentTab('${m}')">
      <span class="med-tab-lbl">${mom.icon} ${escHtml(mom.label)}${isNow ? ' <span class="med-tab-now" title="Moment en cours">●</span>' : ''}</span>
      <span class="med-tab-count">${done}/${its.length}</span>
    </button>`;
  }).join('');

  const activeItems = byMoment[_medMomentTab] || [];
  const heureLimite = MED_HEURE_LIMITE[_medMomentTab];
  const tiles = activeItems.map(e => {
      const r = resMap[String(e.residentId)];
      const rec = e.record;
      const statut = rec?.statut || '';
      const enRetard = !statut && heureLimite != null && (date < today() || (date === today() && nowH >= heureLimite));
      const th = themeFor(statut, enRetard);
      const stDef = statut ? MED_STATUTS[statut] : null;
      const badge = stDef ? stDef.icon : (enRetard ? '⚠' : '💊');
      const pill  = stDef ? `${stDef.icon} ${stDef.label}` : (enRetard ? '⚠ En retard' : 'À donner');
      const color = safeColor(r?.color, '#2563eb');
      const nom = e.residentName || `${r?.prenom || ''} ${r?.nom || ''}`.trim();
      const avatar = r?.photo
        ? `<img class="mtile-ava" src="${sanitizeUrl(r.photo)}" alt="" style="border-color:${th.st}"/>`
        : `<div class="mtile-ava" style="background:${color};border-color:${th.st}">${initials(r?.prenom || '', r?.nom || '')}</div>`;

      // Alerte sécurité (allergie / contre-indication / texture) — conservée sur la tuile
      const reg = r?.regime || {};
      const al = [];
      if ((r?.allergies || '').trim()) al.push(`⚠ Allergie/CI : ${r.allergies}`);
      if ((reg.allergiesAlim || '').trim()) al.push(`🍽 Allergie alim. : ${reg.allergiesAlim}`);
      if (reg.texture && reg.texture !== 'normale') al.push(`🥄 Texture ${reg.texture}`);
      const alTxt = al.join(' · ');

      const args = `'${date}','${e.residentId}','${e.traitementId}','${e.moment}'`;
      const tip = `${escAttr(e.medicament || '')}${e.posologie ? ' · ' + escAttr(e.posologie) : ''}${rec?.heure ? ' — ' + medHeure(rec.heure) : ''}${rec?.auteur ? ' — ' + escAttr(rec.auteur) : ''}${rec?.observation ? ' — 📝 ' + escAttr(rec.observation) : ''}${alTxt ? ' — ' + escAttr(alTxt) : ''}`;
      const handlers = medCanEdit
        ? ` role="button" tabindex="0" onpointerdown="medTileDown(event,${args})" onpointerup="medTileUp()" onpointerleave="medTileUp()" onpointercancel="medTileUp()" onclick="medTileClick(${args})" onkeydown="if((event.key==='Enter'||event.key===' ')&&event.target===this){event.preventDefault();medTileKey(${args})}" oncontextmenu="event.preventDefault();medOpenDetail(${args})"`
        : '';
      return `<div class="mtile" style="--st:${th.st};--rg:${th.rg};--bg:${th.bg}" title="${tip}" aria-label="${escAttr(nom)} — ${escAttr(e.medicament || '')} — ${stDef ? escAttr(stDef.label) : (enRetard ? 'en retard' : 'à donner')}. Toucher pour marquer donné."${handlers}>
        ${alTxt ? `<span class="mtile-alert" title="${escAttr(alTxt)}">⚠</span>` : ''}
        <span class="mtile-badge">${badge}</span>
        ${avatar}
        <div class="mtile-nom">${escHtml(nom) || '—'}</div>
        <div class="mtile-med">${escHtml(e.medicament || '')}${e.posologie ? ` · ${escHtml(e.posologie)}` : ''}</div>
        <div class="mtile-foot">
          <span class="mtile-pill">${pill}</span>
          ${medCanEdit ? `<button type="button" class="mtile-edit" title="Statut détaillé / note" aria-label="Options pour ${escAttr(nom)}" onclick="event.stopPropagation();medOpenDetail(${args})" onpointerdown="event.stopPropagation()">✎</button>` : ''}
        </div>
        ${rec?.observation ? `<div class="mtile-note" title="${escAttr(rec.observation)}">📝 ${escHtml(rec.observation)}</div>` : ''}
      </div>`;
  }).join('');

  listEl.innerHTML = `<div class="med-tabs">${tabsHtml}</div>
    ${activeItems.length
      ? `<div class="med-grid">${tiles}</div>`
      : `<div style="background:rgba(255,255,255,.85);border-radius:16px;padding:1.75rem;text-align:center;font-size:13px;color:#64748b;font-style:italic">Aucune prise prévue à ce moment${(medSearch || medFilterPresent) ? ' (avec ces filtres)' : ''}.</div>`}`;
}

function medRow(date, e) {
  const mom = MED_MOMENTS[e.moment] || {};
  const r = e.record;
  const st = r?.statut ? MED_STATUTS[r.statut] : null;
  return `<div style="display:flex;align-items:center;gap:.7rem;padding:.6rem .85rem;border-bottom:1px solid var(--border);flex-wrap:wrap">
    <span style="font-size:1.1rem;width:28px;text-align:center" title="${escHtml(mom.label || e.moment)}">${mom.icon || ''}</span>
    <div style="flex:1;min-width:160px">
      <div style="font-weight:600;font-size:.83rem">${escHtml(e.medicament || '')}</div>
      <div style="font-size:.72rem;color:var(--muted)">${escHtml(mom.label || e.moment)}${e.posologie ? ' · ' + escHtml(e.posologie) : ''}${r?.heure ? ' · ' + medHeure(r.heure) : ''}${r?.auteur ? ' · ' + escHtml(r.auteur) : ''}</div>
      ${r?.observation ? `<div style="font-size:.72rem;color:var(--muted);margin-top:1px">📝 ${escHtml(r.observation)}</div>` : ''}
    </div>
    ${medCanEdit ? `<div class="no-print" style="display:flex;gap:.25rem;flex-wrap:wrap">
      ${Object.entries(MED_STATUTS).map(([k, v]) => `<button class="btn btn-sm ${r?.statut === k ? 'btn-primary' : 'btn-ghost'}" style="${r?.statut === k ? `background:${v.color};border-color:${v.color}` : ''}" title="${v.label}" onclick="setMedStatut('${date}','${e.residentId}','${e.traitementId}','${e.moment}','${k}')">${v.icon}</button>`).join('')}
      <button class="btn btn-ghost btn-sm" title="Observation" onclick="openMedNote('${date}','${e.residentId}','${e.traitementId}','${e.moment}')">📝</button>
    </div>` : st ? `<span class="badge" style="background:${st.color}1a;color:${st.color}">${st.icon} ${st.label}</span>` : '<span class="badge badge-gray">En attente</span>'}
  </div>`;
}

async function setMedStatut(date, residentId, traitementId, moment, statut) {
  if (!medCanEdit) return;
  const list = getMedDistrib();
  const keyMatch = x => x.date === date && String(x.residentId) === String(residentId) && x.traitementId === traitementId && x.moment === moment;
  const session = Auth.getSession();
  const auteur = [session?.prenom, session?.nom].filter(Boolean).join(' ') || session?.username || '';
  const prevue = medPrevues(date).find(p => String(p.residentId) === String(residentId) && p.traitementId === traitementId && p.moment === moment);
  const i = list.findIndex(keyMatch);
  const _prevStatut = i >= 0 ? list[i].statut : '';   // statut AVANT ce tap (décompte stock)

  // Mise à jour optimiste (synchrone). On mute TOUJOURS le même objet et on
  // capture sa référence pour l'écriture : ainsi des taps rapides (insertion
  // puis suppression) réconcilient le bon id une fois les écritures sérialisées.
  let rec, op;
  if (i >= 0 && list[i].statut === statut) {
    rec = list[i]; op = 'delete';
    list.splice(i, 1); // re-tap sur le même statut → réinitialise
  } else if (i >= 0) {
    rec = list[i]; op = 'save';
    rec.statut = statut; rec.heure = new Date().toISOString(); rec.auteur = auteur;
  } else if (prevue) {
    rec = { date, residentId, residentName: prevue.residentName, traitementId, medicament: prevue.medicament, posologie: prevue.posologie, moment, statut, heure: new Date().toISOString(), auteur, observation: '' };
    op = 'save';
    list.push(rec);
  } else {
    return; // rien de prévu pour cette case
  }
  medApplyStockDelta(residentId, traitementId, medStockDelta(_prevStatut, op === 'delete' ? '' : statut));
  renderMedicaments();
  if (typeof auditLog === 'function' && prevue) auditLog('med_distrib', `${prevue.medicament} (${MED_MOMENTS[moment]?.label || moment}) — ${prevue.residentName} → ${op === 'delete' ? 'réinitialisé' : (MED_STATUTS[statut]?.label || statut)}`);

  await medQueueWrite(async () => {
    if (op === 'delete') {
      if (rec.id) await sbDeleteMedDistrib(rec.id); // sans id = jamais persisté → rien à supprimer
    } else {
      const saved = await sbSaveMedDistrib(rec); // update si rec.id (posé par une insertion antérieure de la file), sinon insert
      Object.assign(rec, saved);
    }
  });
}

async function setMedStatutRefuse(date, residentId, traitementId, moment) {
  const list = getMedDistrib();
  const rec = list.find(x => x.date === date && String(x.residentId) === String(residentId) && x.traitementId === traitementId && x.moment === moment);
  if (rec?.statut === 'refuse') {
    // re-clic → réinitialise sans ouvrir le modal
    await setMedStatut(date, residentId, traitementId, moment, 'refuse');
    return;
  }
  await setMedStatut(date, residentId, traitementId, moment, 'refuse');
  openMedNote(date, residentId, traitementId, moment);
}

function openMedNote(date, residentId, traitementId, moment) {
  medNoteCtx = { date, residentId, traitementId, moment };
  const r = medRecord(date, residentId, traitementId, moment);
  document.getElementById('mnTexte').value = r?.observation || '';
  openModal('modalMedNote');
}

async function saveMedNote() {
  const { date, residentId, traitementId, moment } = medNoteCtx;
  const observation = document.getElementById('mnTexte').value.trim();
  const list = getMedDistrib();
  const keyMatch = x => x.date === date && String(x.residentId) === String(residentId) && x.traitementId === traitementId && x.moment === moment;
  let rec = list.find(keyMatch);
  if (rec) {
    rec.observation = observation; // mutation en place (récupère l'id d'une insertion antérieure de la file)
  } else {
    const prevue = medPrevues(date).find(p => String(p.residentId) === String(residentId) && p.traitementId === traitementId && p.moment === moment);
    if (!prevue) { closeModal('modalMedNote'); return; }
    const session = Auth.getSession();
    const auteur = [session?.prenom, session?.nom].filter(Boolean).join(' ') || session?.username || '';
    rec = { date, residentId, residentName: prevue.residentName, traitementId, medicament: prevue.medicament, posologie: prevue.posologie, moment, statut: '', heure: '', auteur, observation };
    list.push(rec);
  }
  closeModal('modalMedNote');
  renderMedicaments();
  await medQueueWrite(async () => {
    const saved = await sbSaveMedDistrib(rec);
    Object.assign(rec, saved);
  });
}

// ── IMPRESSION ──
function printMedSheet() {
  const date = document.getElementById('medDate').value || today();
  const prevues = medPrevues(date);
  if (!prevues.length) { toast('Aucun traitement à distribuer pour cette date', 'error'); return; }
  const records = getMedDistrib();
  const settings = DB.get(DB.keys.settings) || {};
  const w = window.open('', '_blank');
  if (!w) { toast('Autorisez les fenêtres pop-up pour imprimer', 'error'); return; }
  const momentOrder = Object.keys(MED_MOMENTS);
  const sorted = [...prevues].sort((a, b) => a.residentName.localeCompare(b.residentName, 'fr') || momentOrder.indexOf(a.moment) - momentOrder.indexOf(b.moment));
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Feuille de distribution — ${formatDate(date)}</title>
    <style>
      body{font-family:'Inter','Segoe UI',sans-serif;max-width:1000px;margin:1.5rem auto;padding:0 1.5rem;color:#1e293b;font-size:9pt;line-height:1.5}
      h1{font-size:15pt;color:#0f2b4a;border-bottom:2px solid #0f2b4a;padding-bottom:.3rem}
      .meta{color:#64748b;font-size:9pt;margin-bottom:1.2rem}
      table{width:100%;border-collapse:collapse}
      th{text-align:left;font-size:7.5pt;text-transform:uppercase;letter-spacing:.04em;color:#0f2b4a;border-bottom:2px solid #0f2b4a;padding:.3rem .4rem}
      td{padding:.4rem;border-bottom:1px solid #e2e8f0;font-size:8.5pt;vertical-align:top}
      @page{margin:1.5cm;size:landscape}
    </style></head><body>
    <h1>Feuille de distribution des médicaments</h1>
    <div class="meta">${escHtml(settings.etablissement || 'Établissement')} · ${formatDate(date)} · ${sorted.length} prise(s) prévue(s)</div>
    <table><thead><tr><th>Résident</th><th>Moment</th><th>Médicament</th><th>Posologie</th><th>Statut</th><th>Heure</th><th>Observation</th><th>Signature</th></tr></thead>
    <tbody>${sorted.map(p => {
      const r = records.find(x => x.date === date && String(x.residentId) === String(p.residentId) && x.traitementId === p.traitementId && x.moment === p.moment);
      const st = r?.statut ? MED_STATUTS[r.statut] : null;
      return `<tr>
        <td>${escHtml(p.residentName)}</td>
        <td>${MED_MOMENTS[p.moment]?.icon || ''} ${MED_MOMENTS[p.moment]?.label || p.moment}</td>
        <td>${escHtml(p.medicament || '')}</td>
        <td>${escHtml(p.posologie || '')}</td>
        <td>${st ? st.label : '—'}</td>
        <td>${r?.heure ? medHeure(r.heure) : ''}</td>
        <td>${escHtml(r?.observation || '')}</td>
        <td></td>
      </tr>`;
    }).join('')}</tbody></table>
    <script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}

// ── INIT ──
async function initMedicaments() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('access_medicaments')) return;
  await sbLoadResidentsCache();
  await loadMedCache();
  // Stock de médicaments (panneau « Stock & renouvellements »). Dégradation
  // douce assurée par sbGetStockMed : cache vide si la migration manque.
  if (typeof loadStockMedCache === 'function') await loadStockMedCache();
  if (typeof sbGetPresencesRange === 'function') {
    try {
      const d = new Date(); d.setDate(d.getDate() - 3);
      const from = isoJour(d);
      DB.set(DB.keys.presences, await sbGetPresencesRange(from, today()));
    } catch (e) { console.error(e); }
  }
  medCanEdit = ((typeof canEditResidents === 'function') ? canEditResidents(s.userId) : false) || Auth.isAdmin();
  const dateInput = document.getElementById('medDate');
  dateInput.value = today();
  dateInput.addEventListener('change', renderMedicaments);
  renderMedicaments();
}
document.addEventListener('DOMContentLoaded', initMedicaments);
