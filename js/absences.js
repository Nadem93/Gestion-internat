// ── SUIVI DES ABSENCES & ACCIDENTS DU TRAVAIL ──
const AB_TYPES = {
  maladie:     { label: 'Arrêt maladie',          icon: '🤒', color: '#d97706' },
  at:          { label: 'Accident du travail',    icon: '⚠️', color: '#dc2626' },
  maladie_pro: { label: 'Maladie professionnelle', icon: '🏭', color: '#9333ea' }
};

let abEditId = null;

function getAbsences()      { return DB.get(DB.keys.absencesAT) || []; }
function saveAbsences(list) { DB.set(DB.keys.absencesAT, list); }
function abEmployes()       { return DB.get(DB.keys.employes) || []; }
function abEmployeNom(id)   { const e = abEmployes().find(x => String(x.id) === String(id)); return e ? `${e.prenom||''} ${e.nom||''}`.trim() : 'Inconnu'; }
function abIsCanEdit()      { return Auth.isAdmin() || (typeof canEditResidents === 'function' && canEditResidents(Auth.getSession()?.userId)); }

function abDureeJours(a) {
  const fin = a.fin || today();
  return Math.ceil((new Date(fin + 'T00:00:00') - new Date(a.debut + 'T00:00:00')) / 86400000) + 1;
}

function abEnCours(a) { return !a.fin || a.fin >= today(); }

// ── RENDU PRINCIPAL ──
function renderAbsences() {
  const all = getAbsences();
  const fEmp  = document.getElementById('abFilterEmploye')?.value || '';
  const fType = document.getElementById('abFilterType')?.value || '';

  let list = all;
  if (fEmp)  list = list.filter(a => String(a.employeId) === fEmp);
  if (fType) list = list.filter(a => a.type === fType);
  list = [...list].sort((a,b) => (b.debut||'').localeCompare(a.debut||''));

  const monthPrefix = today().slice(0,7);
  const joursMois = all.reduce((s,a) => {
    const d0 = a.debut, d1 = a.fin || today();
    if (d0.slice(0,7) > monthPrefix || d1.slice(0,7) < monthPrefix) return s;
    return s + abDureeJours(a);
  }, 0);
  const enCours = all.filter(abEnCours);
  const ats = all.filter(a => a.type === 'at');
  const visitesAFaire = all.filter(a => a.visiteDate && !a.visiteFaite && !abEnCours(a));

  document.getElementById('abStats').innerHTML = `
    <div class="stat-card" style="border-left:3px solid #d97706"><div class="stat-card-top"><span class="stat-label">Arrêts en cours</span></div><div class="stat-num">${enCours.length}</div></div>
    <div class="stat-card" style="border-left:3px solid #dc2626"><div class="stat-card-top"><span class="stat-label">Accidents du travail</span></div><div class="stat-num">${ats.length}</div></div>
    <div class="stat-card" style="border-left:3px solid #6366f1"><div class="stat-card-top"><span class="stat-label">Jours d'absence (mois)</span></div><div class="stat-num">${joursMois}</div></div>
    <div class="stat-card" style="border-left:3px solid #8b5cf6"><div class="stat-card-top"><span class="stat-label">Visites reprise à faire</span></div><div class="stat-num">${visitesAFaire.length}</div></div>`;

  const alertsEl = document.getElementById('abAlerts');
  alertsEl.innerHTML = visitesAFaire.length ? visitesAFaire.map(a => `
    <div style="display:flex;align-items:center;gap:.6rem;padding:.6rem .85rem;background:#8b5cf610;border:1px solid #8b5cf633;border-radius:10px;margin-bottom:.5rem;cursor:pointer" onclick="openAbsenceModal('${a.id}')">
      <span style="font-size:1rem">🩺</span><span style="font-size:.82rem;font-weight:600;color:#8b5cf6">Visite de reprise à planifier/faire pour ${escHtml(abEmployeNom(a.employeId))} (retour le ${formatDate(a.fin)})</span>
    </div>`).join('') : '';

  const el = document.getElementById('abList');
  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:2.5rem;text-align:center"><div style="font-size:2.5rem;margin-bottom:.5rem">🩺</div><h3>Aucune absence enregistrée</h3><p>Déclarez un arrêt maladie ou un accident du travail.</p></div>`;
    return;
  }

  el.innerHTML = list.map(abRow).join('');
}

function abRow(a) {
  const t = AB_TYPES[a.type] || AB_TYPES.maladie;
  const enCours = abEnCours(a);
  const duree = abDureeJours(a);
  return `<div style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;background:#fff;border-radius:10px;margin-bottom:6px;box-shadow:0 2px 6px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);border-left:3px solid ${t.color}">
    <span style="font-size:1.2rem;margin-top:2px;flex-shrink:0">${t.icon}</span>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
        <span style="font-weight:600;font-size:.85rem">${escHtml(abEmployeNom(a.employeId))}</span>
        <span style="padding:1px 8px;border-radius:99px;font-size:.68rem;font-weight:700;background:${t.color}18;color:${t.color}">${t.label}</span>
        ${enCours?`<span style="padding:1px 8px;border-radius:99px;font-size:.68rem;font-weight:700;background:#fef9c3;color:#b45309">En cours</span>`:''}
        ${a.prolongation?`<span style="font-size:.68rem;color:var(--muted)">↻ Prolongation</span>`:''}
      </div>
      <div style="font-size:.76rem;color:var(--muted);margin-top:.2rem">
        ${formatDate(a.debut)} ${a.fin?'→ '+formatDate(a.fin):'(en cours)'} · ${duree} jour${duree>1?'s':''}
      </div>
      ${a.visiteDate?`<div style="font-size:.74rem;margin-top:.2rem;color:${a.visiteFaite?'#16a34a':'#8b5cf6'}">🩺 Visite de reprise ${formatDate(a.visiteDate)}${a.visiteFaite?' — effectuée':' — à faire'}</div>`:''}
      ${a.notes?`<div style="font-size:.75rem;color:var(--g600);margin-top:.25rem">${escHtml(a.notes)}</div>`:''}
    </div>
    ${abIsCanEdit()?`<div style="display:flex;gap:.25rem;flex-shrink:0">
      <button class="btn btn-ghost btn-sm" onclick="openAbsenceModal('${a.id}')">✎</button>
      <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="quickDeleteAbsence('${a.id}')">✕</button>
    </div>`:''}
  </div>`;
}

// ── MODAL ──
function openAbsenceModal(id) {
  abEditId = id || null;
  const a = id ? getAbsences().find(x => x.id === id) : null;

  document.getElementById('abModalTitle').textContent = a ? "Modifier l'absence" : 'Déclarer une absence';
  document.getElementById('abEmploye').value = a?.employeId || '';
  document.getElementById('abType').value    = a?.type || 'maladie';
  document.getElementById('abDebut').value   = a?.debut || today();
  document.getElementById('abFin').value     = a?.fin || '';
  document.getElementById('abProlongation').checked = !!a?.prolongation;
  document.getElementById('abVisiteDate').value  = a?.visiteDate || '';
  document.getElementById('abVisiteFaite').checked = !!a?.visiteFaite;
  document.getElementById('abNotes').value   = a?.notes || '';
  document.getElementById('abDeleteBtn').style.display = a ? '' : 'none';
  _abToggleVisiteWrap();
  openModal('modalAbsence');
}

function _abToggleVisiteWrap() {
  const fin = document.getElementById('abFin').value;
  document.getElementById('abVisiteWrap').style.display = fin ? '' : 'none';
}

function saveAbsence() {
  const employeId = document.getElementById('abEmploye').value;
  const debut = document.getElementById('abDebut').value;
  if (!employeId || !debut) { toast('Employé et date de début obligatoires', 'error'); return; }

  const data = {
    employeId,
    type: document.getElementById('abType').value,
    debut,
    fin: document.getElementById('abFin').value,
    prolongation: document.getElementById('abProlongation').checked,
    visiteDate: document.getElementById('abVisiteDate').value,
    visiteFaite: document.getElementById('abVisiteFaite').checked,
    notes: document.getElementById('abNotes').value.trim()
  };

  const list = getAbsences();
  if (abEditId) {
    const idx = list.findIndex(x => x.id === abEditId);
    if (idx >= 0) Object.assign(list[idx], data, { updatedAt: new Date().toISOString() });
    toast('Absence mise à jour');
  } else {
    list.push({ id: genId(), ...data, createdAt: new Date().toISOString() });
    toast('Absence enregistrée', 'success');
  }
  saveAbsences(list);
  if (typeof auditLog === 'function') auditLog('absence_save', `Absence — ${abEmployeNom(employeId)}`);
  closeModal('modalAbsence');
  renderAbsences();
}

function deleteAbsence() {
  if (!abEditId) return;
  confirmDialog('Supprimer cette absence ?', () => {
    saveAbsences(getAbsences().filter(x => x.id !== abEditId));
    closeModal('modalAbsence');
    renderAbsences();
    toast('Absence supprimée', 'info');
  });
}

function quickDeleteAbsence(id) {
  confirmDialog('Supprimer cette absence ?', () => {
    saveAbsences(getAbsences().filter(x => x.id !== id));
    renderAbsences();
    toast('Absence supprimée', 'info');
  });
}

// ── INIT ──
function initAbsences() {
  const s = Auth.requireAuth();
  if (!s) return;
  const employes = abEmployes();
  const opts = employes.map(e => `<option value="${e.id}">${escHtml((e.prenom||'')+' '+(e.nom||''))}</option>`).join('');
  document.getElementById('abFilterEmploye').innerHTML = '<option value="">Tous les employés</option>' + opts;
  document.getElementById('abEmploye').innerHTML = '<option value="">— Choisir —</option>' + opts;

  if (!abIsCanEdit()) { const b = document.getElementById('btnAddAbsence'); if (b) b.style.display = 'none'; }
  document.getElementById('abFin')?.addEventListener('change', _abToggleVisiteWrap);
  ['abFilterEmploye','abFilterType'].forEach(id => document.getElementById(id)?.addEventListener('change', renderAbsences));
  renderAbsences();
}
document.addEventListener('DOMContentLoaded', initAbsences);
