// ── REPAS & RÉGIMES ──
// Inscriptions midi/soir par jour + régimes alimentaires (stockés sur la fiche résident)
let repasDate = null;
let regimeEditId = null;

const REGIME_TYPES = {
  normal: { label: 'Normal', color: '#64748b' },
  vegetarien: { label: 'Végétarien', color: '#16a34a' },
  sansporc: { label: 'Sans porc', color: '#0891b2' },
  halal: { label: 'Halal', color: '#0d9488' },
  casher: { label: 'Casher', color: '#7c3aed' },
  diabetique: { label: 'Diabétique', color: '#d97706' },
  hyposode: { label: 'Hyposodé', color: '#0369a1' },
  hypocalorique: { label: 'Hypocalorique', color: '#be185d' },
  autre: { label: 'Autre', color: '#dc2626' }
};
const TEXTURES = { normale: 'Normale', hachee: 'Hachée', mixee: 'Mixée' };

function getRepas() { return DB.get(DB.keys.repas) || {}; }
function saveRepas(data) { DB.set(DB.keys.repas, data); }

function repasResidents() {
  return (DB.get(DB.keys.residents) || []).filter(r => r.statut !== 'sorti')
    .sort((a, b) => `${a.nom || ''} ${a.prenom || ''}`.localeCompare(`${b.nom || ''} ${b.prenom || ''}`, 'fr'));
}

// Inscrit par défaut : tout résident actif, sauf décoché explicitement
function isInscrit(day, meal, rid) {
  const v = ((day || {})[meal] || {})[rid];
  return v === undefined ? true : !!v;
}

function rgOf(r) { return r.regime || {}; }
function rgBadge(r) {
  const rg = rgOf(r);
  const t = REGIME_TYPES[rg.type] || REGIME_TYPES.normal;
  const parts = [];
  if (rg.type && rg.type !== 'normal') parts.push(`<span class="badge" style="background:${t.color}1a;color:${t.color};border:1px solid ${t.color}44">${t.label}${rg.type === 'autre' && rg.autreLabel ? ' : ' + escHtml(rg.autreLabel) : ''}</span>`);
  if (rg.texture && rg.texture !== 'normale') parts.push(`<span class="badge badge-purple">${TEXTURES[rg.texture]}</span>`);
  const allerg = (rg.allergiesAlim || r.allergies || '').trim();
  if (allerg) parts.push(`<span class="badge badge-red" title="${escHtml(allerg)}">⚠ Allergie</span>`);
  return parts.join(' ') || '<span style="font-size:.72rem;color:var(--g400)">Normal</span>';
}

function renderRepas() {
  const residents = repasResidents();
  const all = getRepas();
  const day = all[repasDate] || {};
  const canEdit = (typeof canEditResidents === 'function') ? canEditResidents(Auth.getSession()?.userId) : Auth.isAdmin();

  const dEl = document.getElementById('rpDate');
  if (dEl && dEl.value !== repasDate) dEl.value = repasDate;
  const lbl = document.getElementById('rpDateLabel');
  if (lbl) lbl.textContent = new Date(repasDate + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Effectifs
  let midi = 0, soir = 0;
  residents.forEach(r => { if (isInscrit(day, 'midi', r.id)) midi++; if (isInscrit(day, 'soir', r.id)) soir++; });
  const regimesPart = residents.filter(r => { const rg = rgOf(r); return (rg.type && rg.type !== 'normal') || (rg.texture && rg.texture !== 'normale'); }).length;
  const allergies = residents.filter(r => ((rgOf(r).allergiesAlim || r.allergies || '').trim())).length;
  document.getElementById('rpStats').innerHTML = `
    <div class="stat-card"><div class="stat-card-top"><span class="stat-label">Midi</span><div class="stat-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg></div></div><div class="stat-num">${midi}</div><div class="stat-change">couverts</div></div>
    <div class="stat-card"><div class="stat-card-top"><span class="stat-label">Soir</span><div class="stat-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div></div><div class="stat-num">${soir}</div><div class="stat-change">couverts</div></div>
    <div class="stat-card"><div class="stat-card-top"><span class="stat-label">Régimes particuliers</span><div class="stat-icon teal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg></div></div><div class="stat-num">${regimesPart}</div></div>
    <div class="stat-card"><div class="stat-card-top"><span class="stat-label">Allergies alim.</span><div class="stat-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div></div><div class="stat-num">${allergies}</div></div>`;

  // Synthèse cuisine par régime (sur les inscrits du jour)
  const cuisine = { midi: {}, soir: {} };
  residents.forEach(r => {
    const rg = rgOf(r);
    const key = (rg.type && rg.type !== 'normal') ? rg.type : 'normal';
    ['midi', 'soir'].forEach(m => { if (isInscrit(day, m, r.id)) cuisine[m][key] = (cuisine[m][key] || 0) + 1; });
  });
  const cuisineRow = m => Object.entries(cuisine[m]).sort((a, b) => b[1] - a[1]).map(([k, n]) => {
    const t = REGIME_TYPES[k] || REGIME_TYPES.autre;
    return `<span class="badge" style="background:${t.color}1a;color:${t.color};border:1px solid ${t.color}44">${t.label} × ${n}</span>`;
  }).join(' ') || '<span style="color:var(--g400);font-size:.78rem">aucun inscrit</span>';
  document.getElementById('rpCuisine').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:.5rem">
      <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap"><strong style="font-size:.8rem;width:46px">☀️ Midi</strong>${cuisineRow('midi')}</div>
      <div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap"><strong style="font-size:.8rem;width:46px">🌙 Soir</strong>${cuisineRow('soir')}</div>
    </div>`;

  // Tableau des résidents
  const q = (document.getElementById('rpSearch')?.value || '').toLowerCase();
  let list = residents;
  if (q) list = list.filter(r => `${r.prenom || ''} ${r.nom || ''} ${r.chambre || ''}`.toLowerCase().includes(q));
  const el = document.getElementById('rpList');
  if (!list.length) {
    el.innerHTML = '<div class="empty" style="padding:2rem"><p>Aucun résident trouvé.</p></div>';
    return;
  }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Résident</th><th>Chambre</th><th>Régime & allergies</th><th style="text-align:center">☀️ Midi</th><th style="text-align:center">🌙 Soir</th><th class="no-print"></th></tr></thead>
    <tbody>${list.map(r => {
      const allerg = (rgOf(r).allergiesAlim || r.allergies || '').trim();
      return `<tr>
        <td style="font-weight:600">${escHtml(`${r.prenom || ''} ${r.nom || ''}`.trim())}</td>
        <td>${r.chambre ? 'Ch. ' + escHtml(r.chambre) : '—'}</td>
        <td><div style="display:flex;gap:.3rem;flex-wrap:wrap;align-items:center">${rgBadge(r)}</div>${allerg ? `<div style="font-size:.7rem;color:#dc2626;margin-top:2px">⚠ ${escHtml(allerg)}</div>` : ''}</td>
        <td style="text-align:center"><input type="checkbox" style="width:18px;height:18px;cursor:pointer" ${isInscrit(day, 'midi', r.id) ? 'checked' : ''} onchange="toggleRepas('${r.id}','midi',this.checked)"/></td>
        <td style="text-align:center"><input type="checkbox" style="width:18px;height:18px;cursor:pointer" ${isInscrit(day, 'soir', r.id) ? 'checked' : ''} onchange="toggleRepas('${r.id}','soir',this.checked)"/></td>
        <td class="no-print" style="text-align:right">${canEdit ? `<button class="btn btn-ghost btn-sm" onclick="openRegimeModal('${r.id}')">🍽 Régime</button>` : ''}</td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

function toggleRepas(rid, meal, checked) {
  const all = getRepas();
  if (!all[repasDate]) all[repasDate] = {};
  if (!all[repasDate][meal]) all[repasDate][meal] = {};
  all[repasDate][meal][rid] = checked ? 1 : 0;
  saveRepas(all);
  renderRepas();
}

function rpShiftDate(days) {
  const d = new Date(repasDate + 'T12:00');
  d.setDate(d.getDate() + days);
  repasDate = d.toISOString().slice(0, 10);
  renderRepas();
}

// ── Régime (stocké sur la fiche résident) ──
function openRegimeModal(rid) {
  const r = (DB.get(DB.keys.residents) || []).find(x => String(x.id) === String(rid));
  if (!r) return;
  regimeEditId = rid;
  const rg = rgOf(r);
  document.getElementById('rgTitle').textContent = `Régime alimentaire — ${`${r.prenom || ''} ${r.nom || ''}`.trim()}`;
  document.getElementById('rgType').value = rg.type || 'normal';
  document.getElementById('rgAutre').value = rg.autreLabel || '';
  document.getElementById('rgTexture').value = rg.texture || 'normale';
  document.getElementById('rgAllergies').value = rg.allergiesAlim !== undefined ? rg.allergiesAlim : (r.allergies || '');
  document.getElementById('rgNotes').value = rg.notes || '';
  rgToggleAutre();
  openModal('modalRegime');
}

function rgToggleAutre() {
  document.getElementById('rgAutreWrap').style.display = document.getElementById('rgType').value === 'autre' ? '' : 'none';
}

function saveRegime() {
  const residents = DB.get(DB.keys.residents) || [];
  const regime = {
    type: document.getElementById('rgType').value,
    autreLabel: document.getElementById('rgAutre').value.trim(),
    texture: document.getElementById('rgTexture').value,
    allergiesAlim: document.getElementById('rgAllergies').value.trim(),
    notes: document.getElementById('rgNotes').value.trim()
  };
  DB.set(DB.keys.residents, residents.map(r => String(r.id) === String(regimeEditId) ? { ...r, regime } : r));
  if (typeof auditLog === 'function') auditLog('regime_save', `Régime — ${(residents.find(r => String(r.id) === String(regimeEditId)) || {}).nom || ''}`);
  toast('Régime enregistré ✓');
  closeModal('modalRegime');
  renderRepas();
}

function initRepas() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('view_residents')) return;
  repasDate = today();
  document.getElementById('rpDate')?.addEventListener('change', e => { if (e.target.value) { repasDate = e.target.value; renderRepas(); } });
  document.getElementById('rpSearch')?.addEventListener('input', renderRepas);
  document.getElementById('rgType')?.addEventListener('change', rgToggleAutre);
  renderRepas();
}
document.addEventListener('DOMContentLoaded', initRepas);
