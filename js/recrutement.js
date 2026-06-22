// ── RECRUTEMENT — pipeline candidats ──
const RC_STATUTS = [
  { id:'recu',              label:'Reçu',               color:'#6366f1' },
  { id:'entretien_planifie',label:'Entretien planifié', color:'#d97706' },
  { id:'entretien_fait',    label:'Entretien réalisé',  color:'#0891b2' },
  { id:'accepte',           label:'Accepté',            color:'#16a34a' },
  { id:'refuse',            label:'Refusé',             color:'#dc2626' }
];
const RC_COLONNES = ['recu','entretien_planifie','entretien_fait','accepte'];

let rcEditId = null;

function getCandidats()      { return DB.get(DB.keys.candidats) || []; }
function saveCandidats(list) { DB.set(DB.keys.candidats, list); }
function rcIsCanEdit()       { return Auth.isAdmin() || (typeof canEditResidents === 'function' && canEditResidents(Auth.getSession()?.userId)); }
function rcStatutInfo(id)    { return RC_STATUTS.find(s => s.id === id) || RC_STATUTS[0]; }

function renderRecrutement() {
  const all = getCandidats();

  document.getElementById('rcStats').innerHTML = `
    <div class="stat-card" style="border-left:3px solid #6366f1"><div class="stat-card-top"><span class="stat-label">Candidatures reçues</span></div><div class="stat-num">${all.length}</div></div>
    <div class="stat-card" style="border-left:3px solid #d97706"><div class="stat-card-top"><span class="stat-label">Entretiens planifiés</span></div><div class="stat-num">${all.filter(c=>c.statut==='entretien_planifie').length}</div></div>
    <div class="stat-card" style="border-left:3px solid #16a34a"><div class="stat-card-top"><span class="stat-label">Acceptés</span></div><div class="stat-num">${all.filter(c=>c.statut==='accepte').length}</div></div>
    <div class="stat-card" style="border-left:3px solid #dc2626"><div class="stat-card-top"><span class="stat-label">Refusés</span></div><div class="stat-num">${all.filter(c=>c.statut==='refuse').length}</div></div>`;

  const board = document.getElementById('rcBoard');
  board.innerHTML = RC_COLONNES.map(colId => {
    const st = rcStatutInfo(colId);
    const items = all.filter(c => (c.statut||'recu') === colId).sort((a,b) => (b.date||'').localeCompare(a.date||''));
    return `<div>
      <div class="rc-col-head" style="color:${st.color}"><span style="width:8px;height:8px;border-radius:50%;background:${st.color}"></span>${st.label} (${items.length})</div>
      <div class="rc-col-body">
        ${items.map(c => rcCard(c, st.color)).join('') || `<div style="font-size:.74rem;color:var(--muted);font-style:italic;padding:.5rem .25rem">Aucun candidat</div>`}
      </div>
    </div>`;
  }).join('');
}

function rcCard(c, color) {
  const nom = `${c.prenom||''} ${c.nom||''}`.trim();
  const nextStatut = RC_COLONNES[RC_COLONNES.indexOf(c.statut) + 1];
  return `<div style="background:#fff;border-radius:12px;border:1px solid var(--border);border-left:3px solid ${color};padding:.7rem .85rem;box-shadow:0 2px 8px rgba(15,23,42,.05)">
    <div style="font-weight:700;font-size:.85rem">${escHtml(nom)}</div>
    <div style="font-size:.74rem;color:var(--muted);margin:.15rem 0 .35rem">${escHtml(c.poste||'')}</div>
    ${c.dateEntretien?`<div style="font-size:.72rem;color:#d97706;margin-bottom:.3rem">📅 Entretien ${formatDate(c.dateEntretien)}</div>`:''}
    ${c.notes?`<div style="font-size:.72rem;color:var(--g600);margin-bottom:.4rem;line-height:1.4">${escHtml(c.notes.slice(0,90))}${c.notes.length>90?'…':''}</div>`:''}
    <div style="display:flex;gap:.3rem;justify-content:flex-end;flex-wrap:wrap">
      ${nextStatut && c.statut!=='refuse' ? `<button class="btn btn-ghost btn-sm" style="font-size:.7rem;color:#16a34a" onclick="rcSetStatut('${c.id}','${nextStatut}')">→ ${rcStatutInfo(nextStatut).label}</button>` : ''}
      ${c.statut!=='refuse' && c.statut!=='accepte' ? `<button class="btn btn-ghost btn-sm" style="font-size:.7rem;color:#dc2626" onclick="rcSetStatut('${c.id}','refuse')">✕ Refuser</button>` : ''}
      <button class="btn btn-ghost btn-sm" style="font-size:.7rem" onclick="openCandidatModal('${c.id}')">✎</button>
    </div>
    ${c.statut==='accepte' ? `<div style="margin-top:.4rem;padding:.4rem .5rem;background:#f0fdf4;border-radius:6px;font-size:.7rem;color:#16a34a">✓ Créez sa fiche employé depuis <a href="admin.html" style="color:#16a34a;text-decoration:underline">Administration → Utilisateurs</a></div>` : ''}
  </div>`;
}

function rcSetStatut(id, statut) {
  const list = getCandidats();
  const c = list.find(x => x.id === id);
  if (!c) return;
  c.statut = statut;
  saveCandidats(list);
  renderRecrutement();
  toast(`Candidat → ${rcStatutInfo(statut).label}`);
}

function openCandidatModal(id) {
  rcEditId = id || null;
  const c = id ? getCandidats().find(x => x.id === id) : null;
  document.getElementById('rcModalTitle').textContent = c ? 'Modifier le candidat' : 'Nouveau candidat';
  document.getElementById('rcPrenom').value = c?.prenom || '';
  document.getElementById('rcNom').value    = c?.nom || '';
  document.getElementById('rcPoste').value  = c?.poste || '';
  document.getElementById('rcTel').value    = c?.tel || '';
  document.getElementById('rcEmail').value  = c?.email || '';
  document.getElementById('rcDate').value   = c?.date || today();
  document.getElementById('rcDateEntretien').value = c?.dateEntretien || '';
  document.getElementById('rcNotes').value  = c?.notes || '';
  document.getElementById('rcDeleteBtn').style.display = c ? '' : 'none';
  openModal('modalCandidat');
}

function saveCandidat() {
  const prenom = document.getElementById('rcPrenom').value.trim();
  const nom    = document.getElementById('rcNom').value.trim();
  const poste  = document.getElementById('rcPoste').value.trim();
  if (!prenom || !nom || !poste) { toast('Prénom, nom et poste obligatoires', 'error'); return; }

  const data = {
    prenom, nom, poste,
    tel: document.getElementById('rcTel').value.trim(),
    email: document.getElementById('rcEmail').value.trim(),
    date: document.getElementById('rcDate').value || today(),
    dateEntretien: document.getElementById('rcDateEntretien').value,
    notes: document.getElementById('rcNotes').value.trim()
  };

  const list = getCandidats();
  if (rcEditId) {
    const idx = list.findIndex(x => x.id === rcEditId);
    if (idx >= 0) Object.assign(list[idx], data, { updatedAt: new Date().toISOString() });
    toast('Candidat mis à jour');
  } else {
    list.push({ id: genId(), ...data, statut: 'recu', createdAt: new Date().toISOString() });
    toast('Candidat ajouté ✓', 'success');
  }
  saveCandidats(list);
  closeModal('modalCandidat');
  renderRecrutement();
}

function deleteCandidat() {
  if (!rcEditId) return;
  confirmDialog('Supprimer ce candidat ?', () => {
    saveCandidats(getCandidats().filter(x => x.id !== rcEditId));
    closeModal('modalCandidat');
    renderRecrutement();
    toast('Candidat supprimé', 'info');
  });
}

function initRecrutement() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!rcIsCanEdit()) { const b = document.getElementById('btnAddCandidat'); if (b) b.style.display = 'none'; }
  renderRecrutement();
}
document.addEventListener('DOMContentLoaded', initRecrutement);
