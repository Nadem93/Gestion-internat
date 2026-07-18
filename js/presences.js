let _presResidentsCache = [];
let _presCache = {}; // { residentId: { statut, motif } }

// ── ÉTATS DE POINTAGE (design B « trombinoscope ») ──
const PRES_STATUTS = {
  present: { label: 'Présent',    icon: '✓', color: '#16a34a', bg: '#f0fdf4', ring: '#86efac' },
  absent:  { label: 'Absent',     icon: '✕', color: '#dc2626', bg: '#fef2f2', ring: '#fca5a5' },
  sortie:  { label: 'Sortie',     icon: '→', color: '#d97706', bg: '#fffbeb', ring: '#fcd34d' },
  unknown: { label: 'Non pointé', icon: '·', color: '#94a3b8', bg: '#f8fafc', ring: '#cbd5e1' }
};
const PRES_CYCLE = { unknown: 'present', present: 'absent', absent: 'sortie', sortie: 'unknown' };

function getDateStr() { return document.getElementById('presenceDate').value || today(); }
function presResidentById(id) { return _presResidentsCache.find(r => String(r.id) === String(id)); }

// La couleur résident vient de la base : on ne l'injecte dans un attribut
// style que si c'est un vrai code hexadécimal (validation centralisée dans app.js).
function presColor(c) { return safeColor(c, '#6b7280'); }

// Rechargement du jour, protégé contre l'obsolescence : si deux navigations
// se chevauchent, seule la plus récente a le droit d'écrire le cache et de
// rendre. Pendant le chargement, les pointages sont ignorés (_presLoading)
// pour ne pas cycler sur les données de l'ancien jour.
let _presLoadSeq = 0, _presLoading = false;

async function refreshPresenceDay() {
  const seq = ++_presLoadSeq;
  _presLoading = true;
  try {
    const [residents, pres] = await Promise.all([sbGetResidents(), sbGetPresencesForDate(getDateStr())]);
    if (seq !== _presLoadSeq) return;
    _presResidentsCache = residents;
    _presCache = pres;
    updateDateLabel();
    renderStats();
    renderPresenceTable();
  } finally {
    if (seq === _presLoadSeq) _presLoading = false;
  }
}

function getPresencesForDate(date) {
  return _presCache;
}

// Toutes les écritures (taps ET bulk) passent par une file unique : elles
// arrivent en base dans l'ordre des gestes. En cas d'échec, on ne recharge
// la vérité serveur qu'une fois la file vidée, sinon le rechargement
// effacerait l'état optimiste des écritures encore en attente.
let _presWriteChain = Promise.resolve();
let _presPendingWrites = 0, _presWriteFailed = false;

function presQueueWrite(fn) {
  _presPendingWrites++;
  _presWriteChain = _presWriteChain.then(async () => {
    try {
      await fn();
    } catch (e) {
      console.error(e);
      _presWriteFailed = true;
      toast('Erreur lors de l\'enregistrement', 'error');
    } finally {
      _presPendingWrites--;
      if (!_presPendingWrites && _presWriteFailed) {
        _presWriteFailed = false;
        await refreshPresenceDay();
      }
    }
  });
  return _presWriteChain;
}

async function setPresence(residentId, statut, motif) {
  const date = getDateStr();
  const prev = _presCache[residentId];
  _presCache[residentId] = { statut, motif: motif !== undefined ? motif : (prev ? prev.motif : '') };
  renderStats();
  renderPresenceTable();
  await presQueueWrite(() => sbSetPresence(residentId, date, statut, motif));
}

// « Tous présents » ne touche que les non-pointés : un statut déjà saisi ou
// une absence planifiée pas encore pointée ne sont jamais écrasés. Un
// résident explicitement dé-pointé (statut « unknown » en base) est repointé.
async function markAllPresent() {
  const dateStr = getDateStr();
  if (_presLoading || dateStr > today()) return;
  const aPointer = _presResidentsCache.filter(r => r.statut !== 'sorti').filter(r => {
    const m = _presCache[r.id];
    if (m && m.statut !== 'unknown') return false;
    if (!m && getPlanningAbsenceJour(r, dateStr)) return false;
    return true;
  });
  if (!aPointer.length) { toast('Tout le monde est déjà pointé'); return; }
  // Optimiste AVANT l'écriture (comme les taps), motif existant préservé
  // pour rester aligné sur l'upsert bulk qui ne touche pas la colonne motif.
  aPointer.forEach(r => {
    const m = _presCache[r.id];
    _presCache[r.id] = { statut: 'present', motif: m ? m.motif : '' };
  });
  renderStats();
  renderPresenceTable();
  const n = aPointer.length;
  await presQueueWrite(async () => {
    await sbSetPresencesBulk(aPointer.map(r => r.id), dateStr, 'present');
    toast(`${n} résident${n > 1 ? 's' : ''} pointé${n > 1 ? 's' : ''} présent${n > 1 ? 's' : ''}`);
  });
}

// Tap sur une tuile : cycle présent → absent → sortie → non pointé.
// Une absence planifiée jamais pointée est d'abord confirmée en « sortie ».
function presCycle(residentId) {
  if (_presLoading || getDateStr() > today()) return;
  const manual = _presCache[residentId];
  let next;
  if (manual) {
    next = PRES_CYCLE[manual.statut] || 'present';
  } else {
    const r = presResidentById(residentId);
    next = (r && getPlanningAbsenceJour(r, getDateStr())) ? 'sortie' : 'present';
  }
  setPresence(residentId, next, '');
}

// ── Appui long : saisie d'un motif ──
let _presLpTimer = null, _presLpFired = false;

function presTileDown(ev, residentId) {
  if (ev && ev.button > 0) return; // clic droit : géré par contextmenu
  _presLpFired = false;
  clearTimeout(_presLpTimer);
  _presLpTimer = setTimeout(() => { _presLpFired = true; presOpenMotif(residentId); }, 500);
}
function presTileUp() { clearTimeout(_presLpTimer); }
function presTileClick(residentId) {
  if (_presLpFired) { _presLpFired = false; return; }
  presCycle(residentId);
}
// Activation clavier : ne passe pas par pointerdown, donc on purge le
// drapeau d'appui long (qui peut rester levé quand le modal a absorbé
// le click de relâchement) au lieu d'avaler le premier appui.
function presTileKey(residentId) {
  _presLpFired = false;
  clearTimeout(_presLpTimer);
  presCycle(residentId);
}

let _presMotifRid = null, _presMotifSel = 'present';

function presOpenMotif(residentId) {
  clearTimeout(_presLpTimer);
  if (_presLoading || getDateStr() > today()) return;
  const r = presResidentById(residentId);
  if (!r) return;
  _presMotifRid = residentId;
  const cur = _presCache[residentId];
  _presMotifSel = cur ? cur.statut : (getPlanningAbsenceJour(r, getDateStr()) ? 'sortie' : 'present');
  document.getElementById('motifResName').textContent = `${r.prenom || ''} ${r.nom || ''}`.trim();
  document.getElementById('motifInput').value = cur && cur.motif ? cur.motif : '';
  presRenderMotifSeg();
  openModal('modalMotif');
  // Le focus entre dans le modal (lecteurs d'écran + navigation clavier)
  setTimeout(() => {
    const inp = document.getElementById('motifInput');
    if (inp && inp.focus) inp.focus();
  }, 60);
}

function presRenderMotifSeg() {
  document.getElementById('motifSeg').innerHTML = Object.entries(PRES_STATUTS).map(([k, st]) => {
    const on = _presMotifSel === k;
    return `<button type="button" aria-pressed="${on}" onclick="presPickMotifStatut('${k}')" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:.5rem .25rem;border-radius:10px;border:1.5px solid;cursor:pointer;font-family:inherit;transition:all .15s;${on ? `background:${st.color};color:#fff;border-color:${st.color}` : `background:${st.bg};color:${st.color};border-color:${st.ring}`}">
      <span style="font-size:.9rem;font-weight:900;line-height:1">${st.icon}</span>
      <span style="font-size:.6rem;font-weight:600;line-height:1">${st.label}</span>
    </button>`;
  }).join('');
}
function presPickMotifStatut(k) { _presMotifSel = k; presRenderMotifSeg(); }

async function presSaveMotif() {
  if (!_presMotifRid) return;
  const motif = document.getElementById('motifInput').value.trim();
  closeModal('modalMotif');
  await setPresence(_presMotifRid, _presMotifSel, motif);
}

function renderStats() {
  const residents = _presResidentsCache.filter(r => r.statut !== 'sorti');
  const presences = getPresencesForDate(getDateStr());
  let present=0, absent=0, sortie=0, unknown=0;
  const dateStr = getDateStr();
  residents.forEach(r => {
    const s = (presences[r.id] || {}).statut || (getPlanningAbsenceJour(r, dateStr) ? 'sortie' : 'unknown');
    if (s==='present') present++;
    else if (s==='absent') absent++;
    else if (s==='sortie') sortie++;
    else unknown++;
  });
  document.getElementById('countPresent').textContent = present;
  document.getElementById('countAbsent').textContent = absent;
  document.getElementById('countSortie').textContent = sortie;
  document.getElementById('countUnknown').textContent = unknown;
}

const JOURS_SEMAINE = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];

function getPlanningAbsenceJour(r, date) {
  if (!r.planningHebdo) return null;
  const dow = new Date(date + 'T00:00:00').getDay();
  const jour = JOURS_SEMAINE[dow];
  const list = (typeof phDayAbsences === 'function') ? phDayAbsences(r.planningHebdo[jour]) : [];
  if (!list.length) return null;
  // Objet synthétique du jour (peut regrouper plusieurs absences : « Travail + Sport »)
  return {
    label: list.map(a => a.label).filter(Boolean).join(' + ') || 'Absence planifiée',
    debut: list[0].debut || '',
    fin: list[list.length - 1].fin || ''
  };
}

function renderPresenceTable() {
  const residents = _presResidentsCache.filter(r => r.statut !== 'sorti');
  const presences = getPresencesForDate(getDateStr());
  const el = document.getElementById('presenceTable');

  if (!residents.length) {
    el.innerHTML = `<div class="empty" style="padding:2rem"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><h3>Aucun résident actif</h3><p><a href="residents.html">Ajouter des résidents</a></p></div>`;
    return;
  }

  const dateStr = getDateStr();
  const isFuture = dateStr > today();
  const tiles = residents.map(r => {
    const manual = presences[r.id];
    const planningJour = !manual && getPlanningAbsenceJour(r, dateStr);
    const sKey = manual ? manual.statut : (planningJour ? 'sortie' : 'unknown');
    const st = PRES_STATUTS[sKey] || PRES_STATUTS.unknown;
    const pointe = !!manual && manual.statut !== 'unknown';
    const motif = (manual && manual.motif) ? manual.motif : '';
    const color = presColor(r.color);
    const nom = `${r.prenom || ''} ${r.nom || ''}`.trim();
    const avatar = r.photo
      ? `<img class="pr-ava" src="${sanitizeUrl(r.photo)}" alt=""/>`
      : `<div class="pr-ava pr-ava-ini" style="background:${color}">${initials(r.prenom, r.nom)}</div>`;

    const planningTag = planningJour
      ? `<div class="pr-plan">📅 ${escHtml(planningJour.label || 'Absence planifiée')}${planningJour.debut ? ' · ' + planningJour.debut : ''}</div>`
      : '';

    return `<div class="pr-tile${pointe ? '' : ' pr-off'}${isFuture ? ' pr-lock' : ''}" role="button" tabindex="0" data-rid="${r.id}"
      style="--st:${st.color};--st-ring:${st.ring};--st-bg:${st.bg}"
      aria-label="${escAttr(nom)} — ${st.label}${motif ? ', motif : ' + escAttr(motif) : ''}. Toucher pour changer l'état."
      onpointerdown="presTileDown(event,'${r.id}')" onpointerup="presTileUp()" onpointerleave="presTileUp()" onpointercancel="presTileUp()"
      onclick="presTileClick('${r.id}')"
      onkeydown="if((event.key==='Enter'||event.key===' ')&&event.target===this){event.preventDefault();presTileKey('${r.id}')}"
      oncontextmenu="event.preventDefault();presOpenMotif('${r.id}')">
      <span class="pr-ava-wrap">${avatar}<span class="pr-badge">${st.icon}</span></span>
      <div class="pr-nom">${escHtml(nom) || '—'}</div>
      <div class="pr-ch">Ch. ${escHtml(r.chambre || '—')}</div>
      ${planningTag}
      <div class="pr-foot">
        <span class="pr-pill">${st.icon} ${st.label}</span>
        <button type="button" class="pr-edit" title="Motif / pointage détaillé" aria-label="Saisir un motif pour ${escAttr(nom)}"
          onclick="event.stopPropagation();presOpenMotif('${r.id}')" onpointerdown="event.stopPropagation()">✎</button>
      </div>
      ${motif ? `<div class="pr-motif" title="${escAttr(motif)}">💬 ${escHtml(motif)}</div>` : ''}
    </div>`;
  }).join('');

  // innerHTML détruit l'élément focalisé : on mémorise la tuile active
  // (navigation clavier) pour lui rendre le focus après re-rendu.
  const act = document.activeElement;
  const actTile = (act && act.closest) ? act.closest('.pr-tile') : null;
  const actRid = actTile ? actTile.getAttribute('data-rid') : null;
  const actEdit = !!(actRid && act.classList && act.classList.contains('pr-edit'));

  el.innerHTML = `<div class="pr-hint">Touchez une tuile pour pointer (présent → absent → sortie) · appui long ou ✎ pour saisir un motif</div>
    <div class="pr-grid">${tiles}</div>`;

  if (actRid && el.querySelector) {
    const tile = el.querySelector(`.pr-tile[data-rid="${actRid}"]`);
    const cible = tile && actEdit ? tile.querySelector('.pr-edit') : tile;
    if (cible && cible.focus) cible.focus();
  }
}

function updateDateLabel() {
  const d = new Date(getDateStr() + 'T00:00:00');
  document.getElementById('presenceDateLabel').textContent = d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

// Format AAAA-MM-JJ en heure LOCALE : toISOString() renvoie le jour UTC,
// qui est la veille quand il est minuit en France — toute la période de
// l'export serait décalée d'un jour.
function presDateLocale(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function openExportModal() {
  const start = today();
  const end = new Date(); end.setDate(end.getDate()+1);
  document.getElementById('exportStart').value = start;
  document.getElementById('exportEnd').value = presDateLocale(end);
  openModal('modalExportAbs');
}

async function exportPresencesPDF() {
  try {
    const start = document.getElementById('exportStart').value;
    const end   = document.getElementById('exportEnd').value;
    if (!start || !end) { toast('Sélectionnez une période', 'error'); return; }

    const allPresences = await sbGetPresencesRange(start, end);
    const residents    = (await sbGetResidents()).filter(r => r.statut !== 'sorti');
    const settings     = DB.get(DB.keys.settings)  || {};
    const brand        = DB.get(DB.keys.branding)  || {};
    const pc = brand.primaryColor || '#0f2b4a';
    const ac = brand.accentColor  || '#e85d04';
    const etab = settings.etablissement || 'FTR';

    // Build list of dates in range
    const dates = [];
    for (let d = new Date(start+'T00:00:00'); d <= new Date(end+'T00:00:00'); d.setDate(d.getDate()+1)) {
      dates.push(presDateLocale(d));
    }
    if (!dates.length) { toast('Période invalide', 'error'); return; }

    const statusLetter = { present:'P', absent:'A', sortie:'S', permission:'Pe', malade:'M', unknown:'' };
    const statusColor  = { present:'#16a34a', absent:'#dc2626', sortie:'#ca8a04', permission:'#2563eb', malade:'#9333ea' };
    const statusLabel  = { present:'Présent', absent:'Absent', sortie:'Sorti', permission:'Permission', malade:'Malade' };

    // Summary per resident
    const summaryRows = residents.map(r => {
      const name = `${r.prenom||''} ${r.nom||''}`.trim();
      let present=0, absent=0, sortie=0, autre=0;
      dates.forEach(ds => {
        const s = (allPresences[ds]||{})[r.id] || 'unknown';
        if (s==='present') present++;
        else if (s==='absent') absent++;
        else if (s==='sortie') sortie++;
        else if (s && s!=='unknown') autre++;
      });
      const cells = dates.map(ds => {
        const s = (allPresences[ds]||{})[r.id] || '';
        const letter = statusLetter[s] || '';
        const color  = statusColor[s]  || '#94a3b8';
        return `<td style="text-align:center;padding:3px 4px;font-size:9px;font-weight:700;color:${letter?color:'#cbd5e1'}">${letter||'·'}</td>`;
      }).join('');
      const pct = dates.length ? Math.round(present/dates.length*100) : 0;
      return { name, cells, present, absent, sortie, autre, pct };
    });

    const now = new Date().toLocaleDateString('fr-FR');
    const dateHeaders = dates.map(ds => {
      const d = new Date(ds+'T12:00:00');
      return `<th style="text-align:center;padding:4px 2px;font-size:8px;font-weight:700;min-width:22px;writing-mode:vertical-rl;transform:rotate(180deg);height:50px">${d.getDate()}/${d.getMonth()+1}</th>`;
    }).join('');

    const tableRows = summaryRows.map((r, i) => `
      <tr style="background:${i%2===0?'#f8fafc':'#fff'}">
        <td style="padding:5px 10px;font-weight:600;white-space:nowrap;border-right:1px solid #e2e8f0">${escHtml(r.name)}</td>
        ${r.cells}
        <td style="text-align:center;padding:4px 6px;font-size:9px;font-weight:700;color:#16a34a;border-left:1px solid #e2e8f0">${r.present}</td>
        <td style="text-align:center;padding:4px 6px;font-size:9px;font-weight:700;color:#dc2626">${r.absent}</td>
        <td style="text-align:center;padding:4px 6px;font-size:9px;font-weight:700;color:#ca8a04">${r.sortie}</td>
        <td style="text-align:center;padding:4px 6px;font-size:9px;font-weight:700;color:#0f2b4a">${r.pct}%</td>
      </tr>`).join('');

    const legendHtml = Object.entries(statusLabel).map(([k,v]) =>
      `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;font-size:10px"><span style="font-weight:800;color:${statusColor[k]}">${statusLetter[k]}</span> = ${v}</span>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Présences — ${etab}</title>
<style>
  @page{margin:1cm 1.2cm;size:A4 landscape}
  body{margin:0;font-family:Inter,system-ui,sans-serif;font-size:10px;color:#1e293b}
  .top-stripe{height:5px;background:linear-gradient(90deg,${pc},${ac})}
  .doc-header{display:flex;align-items:flex-start;justify-content:space-between;padding:12px 20px 10px;border-bottom:2px solid #e2e8f0}
  .doc-header h1{margin:0;font-size:16px;font-weight:800;color:${pc}}
  .doc-header .sub{font-size:10px;color:#64748b;margin-top:2px}
  .doc-meta{font-size:9px;color:#64748b;text-align:right}
  .wrap{padding:12px 20px}
  table{width:100%;border-collapse:collapse;font-size:9px}
  thead th{background:${pc};color:#fff;padding:5px 4px;text-align:left;font-size:9px;font-weight:700}
  thead th:first-child{text-align:left;min-width:120px}
  td{border:1px solid #e8ecf0}
  .legend{margin-top:10px;padding:8px 12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0}
  .actions{margin-bottom:12px}
  .actions button{padding:6px 16px;border:none;border-radius:6px;background:${pc};color:#fff;font-weight:600;cursor:pointer;font-size:10px;margin-right:6px}
  @media print{.actions{display:none}}
</style></head><body>
<div class="top-stripe"></div>
<div class="doc-header">
  <div><h1>${escHtml(etab)}</h1><div class="sub">Registre des présences</div></div>
  <div class="doc-meta">Période : ${start} → ${end}<br>${dates.length} jour${dates.length>1?'s':''} · ${residents.length} résident${residents.length>1?'s':''}<br>Généré le ${now}</div>
</div>
<div class="wrap">
  <div class="actions"><button onclick="window.print()">🖨 Imprimer / Enregistrer PDF</button><button onclick="window.close()">Fermer</button></div>
  <table>
    <thead>
      <tr>
        <th style="min-width:130px;vertical-align:bottom;padding:6px 10px">Résident</th>
        ${dateHeaders}
        <th style="text-align:center;padding:4px 6px;min-width:25px;background:#1e3a5f">P</th>
        <th style="text-align:center;padding:4px 6px;min-width:25px;background:#7f1d1d">A</th>
        <th style="text-align:center;padding:4px 6px;min-width:25px;background:#78350f">S</th>
        <th style="text-align:center;padding:4px 6px;min-width:30px;background:#1e3a5f">%</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="legend">${legendHtml}</div>
</div>
</body></html>`;

    closeModal('modalExportAbs');
    const w = window.open('', '_blank', 'width=1100,height=750');
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 600); }
    else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], { type:'text/html' }));
      a.download = `presences-${start}-${end}.html`;
      a.click();
    }
    toast('Export généré ✓');
  } catch(e) { toast('Erreur : '+e.message, 'error'); console.error(e); }
}

async function initPresences() {
  if (!requireModule('access_presences')) return;
  const dateInput = document.getElementById('presenceDate');
  dateInput.max = today();
  dateInput.value = today();
  dateInput.addEventListener('change', () => {
    if (dateInput.value > today()) dateInput.value = today();
    refreshPresenceDay();
  });
  await refreshPresenceDay();
  document.getElementById('prevDay').addEventListener('click', () => {
    const d = new Date(getDateStr()); d.setDate(d.getDate()-1);
    dateInput.value = d.toISOString().slice(0,10);
    refreshPresenceDay();
  });
  document.getElementById('nextDay').addEventListener('click', () => {
    if (getDateStr() >= today()) return;
    const d = new Date(getDateStr()); d.setDate(d.getDate()+1);
    dateInput.value = d.toISOString().slice(0,10);
    refreshPresenceDay();
  });
  document.getElementById('todayBtn').addEventListener('click', () => {
    document.getElementById('presenceDate').value = today();
    refreshPresenceDay();
  });
}
document.addEventListener('DOMContentLoaded', initPresences);
if (typeof registerPageInit === 'function') registerPageInit('presences', initPresences);
