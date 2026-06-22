// ── GESTION DES CONTRATS ──
const CT_TYPES = {
  cdi:        { label: 'CDI',        color: '#16a34a' },
  cdd:        { label: 'CDD',        color: '#d97706' },
  vacation:   { label: 'Vacation',   color: '#6366f1' },
  stage:      { label: 'Stage',      color: '#0891b2' },
  alternance: { label: 'Alternance', color: '#8b5cf6' }
};

let ctEditId = null;
let ctAvenants = [];

function getContrats()      { return DB.get(DB.keys.contrats) || []; }
function saveContrats(list) { DB.set(DB.keys.contrats, list); }
function ctEmployes()       { return DB.get(DB.keys.employes) || []; }
function ctEmployeNom(id)   { const e = ctEmployes().find(x => String(x.id) === String(id)); return e ? `${e.prenom||''} ${e.nom||''}`.trim() : 'Inconnu'; }

function ctIsCanEdit() {
  return Auth.isAdmin() || (typeof canEditResidents === 'function' && canEditResidents(Auth.getSession()?.userId));
}

function ctJoursRestants(dateFin) {
  if (!dateFin) return null;
  return Math.ceil((new Date(dateFin + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000);
}

// ── RENDU PRINCIPAL ──
function renderContrats() {
  const all = getContrats();
  const fEmp  = document.getElementById('ctFilterEmploye')?.value || '';
  const fType = document.getElementById('ctFilterType')?.value || '';
  const fStat = document.getElementById('ctFilterStatut')?.value || '';

  let list = all;
  if (fEmp)  list = list.filter(c => String(c.employeId) === fEmp);
  if (fType) list = list.filter(c => c.type === fType);
  if (fStat) list = list.filter(c => (c.statut || 'actif') === fStat);
  list = [...list].sort((a,b) => (b.debut||'').localeCompare(a.debut||''));

  const actifs = all.filter(c => (c.statut || 'actif') === 'actif');
  const cddBientotFini = actifs.filter(c => c.type === 'cdd' && c.fin && ctJoursRestants(c.fin) !== null && ctJoursRestants(c.fin) <= 30 && ctJoursRestants(c.fin) >= 0);
  const essaisEnCours  = actifs.filter(c => c.essai && ctJoursRestants(c.essai) !== null && ctJoursRestants(c.essai) <= 15 && ctJoursRestants(c.essai) >= 0);

  document.getElementById('ctStats').innerHTML = `
    <div class="stat-card" style="border-left:3px solid #16a34a"><div class="stat-card-top"><span class="stat-label">Contrats actifs</span></div><div class="stat-num">${actifs.length}</div></div>
    <div class="stat-card" style="border-left:3px solid #d97706"><div class="stat-card-top"><span class="stat-label">CDD actifs</span></div><div class="stat-num">${actifs.filter(c=>c.type==='cdd').length}</div></div>
    <div class="stat-card" style="border-left:3px solid #dc2626"><div class="stat-card-top"><span class="stat-label">Fins de CDD ≤30j</span></div><div class="stat-num">${cddBientotFini.length}</div></div>
    <div class="stat-card" style="border-left:3px solid #8b5cf6"><div class="stat-card-top"><span class="stat-label">Périodes d'essai ≤15j</span></div><div class="stat-num">${essaisEnCours.length}</div></div>`;

  // Alertes
  const alertsEl = document.getElementById('ctAlerts');
  const alerts = [];
  cddBientotFini.forEach(c => alerts.push({ c, txt: `CDD de ${escHtml(ctEmployeNom(c.employeId))} se termine le ${formatDate(c.fin)} (J-${ctJoursRestants(c.fin)})`, color:'#dc2626' }));
  essaisEnCours.forEach(c => alerts.push({ c, txt: `Période d'essai de ${escHtml(ctEmployeNom(c.employeId))} se termine le ${formatDate(c.essai)} (J-${ctJoursRestants(c.essai)})`, color:'#8b5cf6' }));
  alertsEl.innerHTML = alerts.length ? alerts.map(a => `
    <div style="display:flex;align-items:center;gap:.6rem;padding:.6rem .85rem;background:${a.color}10;border:1px solid ${a.color}33;border-radius:10px;margin-bottom:.5rem;cursor:pointer" onclick="openContratModal('${a.c.id}')">
      <span style="font-size:1rem">⚠️</span><span style="font-size:.82rem;font-weight:600;color:${a.color}">${a.txt}</span>
    </div>`).join('') : '';

  const el = document.getElementById('ctList');
  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:2.5rem;text-align:center"><div style="font-size:2.5rem;margin-bottom:.5rem">📑</div><h3>Aucun contrat</h3><p>Créez le premier contrat d'un employé.</p></div>`;
    return;
  }

  el.innerHTML = `<div class="grid grid-3" style="gap:.85rem">${list.map(ctCard).join('')}</div>`;
}

function ctCard(c) {
  const t = CT_TYPES[c.type] || CT_TYPES.cdi;
  const statutTermine = (c.statut || 'actif') === 'termine';
  const joursRestants = c.fin ? ctJoursRestants(c.fin) : null;
  const urgent = c.type === 'cdd' && joursRestants !== null && joursRestants <= 30 && joursRestants >= 0 && !statutTermine;
  return `<div style="background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(15,23,42,.06);border:1px solid var(--border);overflow:hidden;display:flex;flex-direction:column;${statutTermine?'opacity:.6':''}">
    <div style="background:linear-gradient(135deg,${t.color}22,${t.color}08);border-bottom:1px solid ${t.color}22;padding:.9rem 1rem .75rem;display:flex;align-items:center;gap:.65rem">
      <div style="width:38px;height:38px;border-radius:10px;background:${t.color}18;border:1.5px solid ${t.color}33;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.85rem;color:${t.color};flex-shrink:0">${t.label.slice(0,3)}</div>
      <div style="min-width:0;flex:1">
        <div style="font-weight:700;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(ctEmployeNom(c.employeId))}</div>
        <div style="font-size:.68rem;font-weight:600;color:${t.color};margin-top:1px">${t.label}${statutTermine?' · terminé':''}</div>
      </div>
    </div>
    <div style="padding:.85rem 1rem;flex:1;display:flex;flex-direction:column;gap:.35rem">
      <div style="font-size:.78rem;color:var(--text);display:flex;flex-direction:column;gap:.2rem">
        <div style="display:flex;align-items:center;gap:.4rem">📅 <span>${formatDate(c.debut)}${c.fin?' → '+formatDate(c.fin):' · sans échéance'}</span></div>
        ${c.poste?`<div style="display:flex;align-items:center;gap:.4rem">💼 <span>${escHtml(c.poste)}</span></div>`:''}
        ${c.heures?`<div style="display:flex;align-items:center;gap:.4rem">⏱ <span>${c.heures}h/semaine (${c.temps==='partiel'?'temps partiel':'temps plein'})</span></div>`:''}
      </div>
      ${urgent?`<span style="display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;font-size:.7rem;font-weight:600;background:#fee2e2;color:#dc2626;border:1px solid #fecaca;width:fit-content">Fin dans ${joursRestants}j</span>`:''}
      ${c.avenants?.length?`<div style="font-size:.71rem;color:var(--muted);margin-top:.1rem">${c.avenants.length} avenant${c.avenants.length>1?'s':''}</div>`:''}
    </div>
    ${ctIsCanEdit()?`<div style="display:flex;gap:.3rem;justify-content:flex-end;border-top:1px solid var(--border);padding:.5rem .75rem;background:var(--g50)">
      <button class="btn btn-ghost btn-sm" onclick="openContratModal('${c.id}')">✎ Détail</button>
    </div>`:''}
  </div>`;
}

// ── MODAL ──
function openContratModal(id) {
  ctEditId = id || null;
  const c = id ? getContrats().find(x => x.id === id) : null;
  ctAvenants = c?.avenants ? [...c.avenants] : [];

  document.getElementById('ctModalTitle').textContent = c ? 'Modifier le contrat' : 'Nouveau contrat';
  document.getElementById('ctEmploye').value = c?.employeId || '';
  document.getElementById('ctType').value    = c?.type || 'cdi';
  document.getElementById('ctDebut').value   = c?.debut || today();
  document.getElementById('ctFin').value     = c?.fin || '';
  document.getElementById('ctTemps').value   = c?.temps || 'plein';
  document.getElementById('ctHeures').value  = c?.heures || 35;
  document.getElementById('ctEssai').value   = c?.essai || '';
  document.getElementById('ctPoste').value   = c?.poste || '';
  document.getElementById('ctNotes').value   = c?.notes || '';
  document.getElementById('ctDeleteBtn').style.display = c ? '' : 'none';
  document.getElementById('ctAvenantsSection').style.display = c ? '' : 'none';
  renderAvenantsList();
  openModal('modalContrat');
}

function renderAvenantsList() {
  const box = document.getElementById('ctAvenantsList');
  if (!box) return;
  box.innerHTML = ctAvenants.length ? ctAvenants.map((a,i) => `
    <div style="display:flex;align-items:center;gap:.5rem;padding:.4rem .6rem;background:var(--g50);border-radius:6px;margin-bottom:.25rem">
      <span style="font-size:.72rem;color:var(--muted);white-space:nowrap">${formatDate(a.date)}</span>
      <span style="font-size:.78rem;flex:1">${escHtml(a.texte)}</span>
      <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="removeAvenant(${i})">✕</button>
    </div>`).join('') : '<div style="font-size:.74rem;color:var(--muted);font-style:italic;padding:.3rem 0">Aucun avenant.</div>';
}

function addAvenant() {
  const txt = document.getElementById('ctAvenantTxt').value.trim();
  if (!txt) return;
  ctAvenants.push({ id: genId(), date: today(), texte: txt });
  document.getElementById('ctAvenantTxt').value = '';
  renderAvenantsList();
}

function removeAvenant(idx) {
  ctAvenants.splice(idx, 1);
  renderAvenantsList();
}

function saveContrat() {
  const employeId = document.getElementById('ctEmploye').value;
  const debut = document.getElementById('ctDebut').value;
  if (!employeId || !debut) { toast('Employé et date de début obligatoires', 'error'); return; }

  const data = {
    employeId,
    type: document.getElementById('ctType').value,
    debut,
    fin: document.getElementById('ctFin').value,
    temps: document.getElementById('ctTemps').value,
    heures: Number(document.getElementById('ctHeures').value) || 0,
    essai: document.getElementById('ctEssai').value,
    poste: document.getElementById('ctPoste').value.trim(),
    notes: document.getElementById('ctNotes').value.trim(),
    avenants: ctAvenants
  };

  const list = getContrats();
  if (ctEditId) {
    const idx = list.findIndex(x => x.id === ctEditId);
    if (idx >= 0) Object.assign(list[idx], data, { updatedAt: new Date().toISOString() });
    toast('Contrat mis à jour');
  } else {
    list.push({ id: genId(), ...data, statut: 'actif', createdAt: new Date().toISOString() });
    toast('Contrat créé ✓', 'success');
  }
  saveContrats(list);
  if (typeof auditLog === 'function') auditLog('contrat_save', `Contrat — ${ctEmployeNom(employeId)}`);
  closeModal('modalContrat');
  renderContrats();
}

function deleteContrat() {
  if (!ctEditId) return;
  confirmDialog('Supprimer ce contrat ?', () => {
    saveContrats(getContrats().filter(x => x.id !== ctEditId));
    closeModal('modalContrat');
    renderContrats();
    toast('Contrat supprimé', 'info');
  });
}

// ── INIT ──
function initContrats() {
  const s = Auth.requireAuth();
  if (!s) return;
  const employes = ctEmployes();
  const opts = employes.map(e => `<option value="${e.id}">${escHtml((e.prenom||'')+' '+(e.nom||''))}</option>`).join('');
  document.getElementById('ctFilterEmploye').innerHTML = '<option value="">Tous les employés</option>' + opts;
  document.getElementById('ctEmploye').innerHTML = '<option value="">— Choisir —</option>' + opts;

  if (!ctIsCanEdit()) { const b = document.getElementById('btnAddContrat'); if (b) b.style.display = 'none'; }
  ['ctFilterEmploye','ctFilterType','ctFilterStatut'].forEach(id => document.getElementById(id)?.addEventListener('change', renderContrats));
  renderContrats();
}
document.addEventListener('DOMContentLoaded', initContrats);
