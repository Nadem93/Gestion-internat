const BUDGET_STATUT_STYLES = { en_attente: { bg:'#d9770618', c:'#d97706', l:'En attente' }, accepte: { bg:'#16a34a18', c:'#16a34a', l:'Accepté' }, refuse: { bg:'#ef444418', c:'#ef4444', l:'Refusé' } };

function getBudgetEnveloppes() { return DB.get(DB.keys.budgetEnveloppes) || []; }
function setBudgetEnveloppes(d) { DB.set(DB.keys.budgetEnveloppes, d); }
function getBudgetDemandes() { return DB.get(DB.keys.budgetDemandes) || []; }
function setBudgetDemandes(d) { DB.set(DB.keys.budgetDemandes, d); }

function budgetFmtMontant(n) {
  return (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function budgetFmtSize(b) {
  if (!b) return '';
  if (b < 1024) return b + ' o';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' Ko';
  return (b / (1024 * 1024)).toFixed(1) + ' Mo';
}

function budgetCurrentUser() {
  const session = Auth.getSession();
  if (!session) return { employeId: 'anon', employeNom: 'Inconnu' };
  const users = DB.get(DB.keys.users) || [];
  const user = users.find(u => String(u.id) === String(session.userId));
  const prenom = user?.prenom || session.prenom || '';
  const nom = user?.nom || session.nom || '';
  const employes = DB.get(DB.keys.employes) || [];
  const emp = employes.find(e => prenom && nom && e.prenom === prenom && e.nom === nom);
  return {
    employeId: emp ? emp.id : 'u' + session.userId,
    employeNom: [prenom, nom].filter(Boolean).join(' ') || session.username
  };
}

function budgetEnveloppeUtilise(enveloppeId) {
  return getBudgetDemandes().filter(d => d.enveloppeId === enveloppeId && d.statut === 'accepte')
    .reduce((s, d) => s + (Number(d.montant) || 0), 0);
}

function initBudget() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('access_budget')) return;
  if (Auth.isAdmin()) {
    const empSel = document.getElementById('bgFiltreEmploye');
    if (empSel) empSel.style.display = '';
  }
  renderBudget();
}

// ── ENVELOPPES ──
function openEnveloppeModal(id) {
  const enveloppes = getBudgetEnveloppes();
  const env = id ? enveloppes.find(e => e.id === id) : null;
  const html = `<div class="modal-overlay" id="modalBudgetEnv" style="display:flex" onclick="closeModal('modalBudgetEnv')">
    <div class="modal" style="max-width:440px" onclick="event.stopPropagation()">
      <div class="modal-header"><span class="modal-title">${env ? '✎ Modifier l’enveloppe' : '📁 Demande de budget'}</span><button class="modal-close" onclick="closeModal('modalBudgetEnv')">&times;</button></div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:.75rem">
        <div class="form-group"><label>Nom *</label><input type="text" id="benvNom" class="form-input" value="${env ? escHtml(env.nom) : ''}" placeholder="Ex: Activités éducatives"/></div>
        <div class="form-group"><label>Montant alloué (€) *</label><input type="number" id="benvMontant" class="form-input" min="0" step="0.01" value="${env ? env.montant : ''}"/></div>
        <div class="form-group"><label>Description</label><textarea id="benvDescription" class="form-input" rows="2">${env ? escHtml(env.description || '') : ''}</textarea></div>
      </div>
      <div class="modal-footer">
        ${env ? `<button class="btn btn-ghost" style="color:var(--red);margin-right:auto" onclick="deleteEnveloppe('${env.id}')">🗑 Supprimer</button>` : ''}
        <button class="btn btn-ghost" onclick="closeModal('modalBudgetEnv')">Annuler</button>
        <button class="btn btn-primary" onclick="saveEnveloppe('${env ? env.id : ''}')">💾 Enregistrer</button>
      </div>
    </div>
  </div>`;
  const old = document.getElementById('modalBudgetEnv');
  if (old) old.remove();
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
  requestAnimationFrame(() => document.getElementById('modalBudgetEnv')?.classList.add('open'));
}

function saveEnveloppe(id) {
  const nom = document.getElementById('benvNom').value.trim();
  const montant = parseFloat(document.getElementById('benvMontant').value);
  const description = document.getElementById('benvDescription').value.trim();
  if (!nom) { toast('Le nom est requis', 'error'); return; }
  if (isNaN(montant) || montant < 0) { toast('Montant invalide', 'error'); return; }
  let list = getBudgetEnveloppes();
  if (id) {
    list = list.map(e => e.id === id ? { ...e, nom, montant, description } : e);
    toast('Enveloppe mise à jour');
  } else {
    list.push({ id: genId(), nom, montant, description, createdAt: new Date().toISOString() });
    toast('Enveloppe créée');
  }
  setBudgetEnveloppes(list);
  if (typeof auditLog === 'function') auditLog('budget_enveloppe', nom);
  closeModal('modalBudgetEnv');
  document.getElementById('modalBudgetEnv')?.remove();
  renderBudget();
}

function deleteEnveloppe(id) {
  if (!confirm('Supprimer cette enveloppe ? Les demandes associées seront conservées.')) return;
  let list = getBudgetEnveloppes();
  list = list.filter(e => e.id !== id);
  setBudgetEnveloppes(list);
  closeModal('modalBudgetEnv');
  document.getElementById('modalBudgetEnv')?.remove();
  toast('Enveloppe supprimée', 'info');
  renderBudget();
}

function renderEnveloppes() {
  const list = getBudgetEnveloppes();
  const el = document.getElementById('bgEnveloppesList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<div class="empty" style="padding:1.5rem;text-align:center"><p>Aucune enveloppe budgétaire définie.</p></div>';
    return;
  }
  el.innerHTML = list.map(env => {
    const utilise = budgetEnveloppeUtilise(env.id);
    const total = Number(env.montant) || 0;
    const pct = total > 0 ? Math.min(100, Math.round(utilise / total * 100)) : 0;
    const over = utilise > total;
    return `<div style="padding:.75rem 1rem;background:#fff;border:1px solid var(--border);border-radius:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem">
        <div>
          <div style="font-weight:600;font-size:.85rem">${escHtml(env.nom)}</div>
          ${env.description ? `<div style="font-size:.72rem;color:var(--muted)">${escHtml(env.description)}</div>` : ''}
        </div>
        <div class="admin-only" style="display:flex;gap:.25rem;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" onclick="openEnveloppeModal('${env.id}')" title="Modifier">✎</button>
        </div>
      </div>
      <div class="progress-bar" style="margin-top:.5rem"><div class="progress-fill" style="width:${pct}%;background:${over ? '#ef4444' : '#16a34a'}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--muted);margin-top:.25rem">
        <span>${budgetFmtMontant(utilise)} dépensés (${pct}%)</span>
        <span>${budgetFmtMontant(Math.max(0, total - utilise))} restants sur ${budgetFmtMontant(total)}</span>
      </div>
    </div>`;
  }).join('');
}

// ── NOUVELLE DEMANDE ──
window._pendingBudgetFiles = [];

function openNouvelleDemandeBudget() {
  window._pendingBudgetFiles = [];
  document.getElementById('bgFormMontant').value = '';
  document.getElementById('bgFormDate').value = today();
  document.getElementById('bgFormMotif').value = '';
  document.getElementById('bgFormFileInput').value = '';
  renderBudgetPendingFiles();
  const sel = document.getElementById('bgFormEnveloppe');
  const enveloppes = getBudgetEnveloppes();
  sel.innerHTML = '<option value="">— Aucune enveloppe —</option>' + enveloppes.map(e => `<option value="${e.id}">${escHtml(e.nom)}</option>`).join('');
  openModal('modalBudgetDemande');
}

async function handleBudgetFileSelect(e) {
  const files = Array.from(e.target.files || []);
  for (const f of files) {
    if (f.size > 3 * 1024 * 1024) { toast(`${f.name} trop lourd (max 3 Mo)`, 'error'); continue; }
    try {
      const data = await fileToBase64(f);
      window._pendingBudgetFiles.push({ id: genId(), name: f.name, mimeType: f.type, size: f.size, data });
    } catch { toast('Erreur de lecture : ' + f.name, 'error'); }
  }
  e.target.value = '';
  renderBudgetPendingFiles();
}

function removeBudgetPendingFile(id) {
  window._pendingBudgetFiles = window._pendingBudgetFiles.filter(f => f.id !== id);
  renderBudgetPendingFiles();
}

function renderBudgetPendingFiles() {
  const el = document.getElementById('bgFormFiles');
  if (!el) return;
  if (!window._pendingBudgetFiles.length) { el.innerHTML = ''; return; }
  el.innerHTML = window._pendingBudgetFiles.map(f => `<div style="display:flex;align-items:center;gap:.4rem;font-size:.76rem;padding:.25rem .5rem;background:var(--g50);border-radius:6px;margin-bottom:4px">
    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📎 ${escHtml(f.name)} <span style="color:var(--muted)">(${budgetFmtSize(f.size)})</span></span>
    <button class="btn btn-ghost btn-sm" style="color:var(--red);padding:0 6px" onclick="removeBudgetPendingFile('${f.id}')">✕</button>
  </div>`).join('');
}

function saveBudgetDemande() {
  const enveloppeId = document.getElementById('bgFormEnveloppe').value;
  const env = getBudgetEnveloppes().find(e => e.id === enveloppeId);
  const montant = parseFloat(document.getElementById('bgFormMontant').value);
  const dateDepense = document.getElementById('bgFormDate').value;
  const motif = document.getElementById('bgFormMotif').value.trim();
  if (!montant || montant <= 0) { toast('Montant invalide', 'error'); return; }
  if (!dateDepense) { toast('Date de la dépense requise', 'error'); return; }
  if (!motif) { toast('Motif requis', 'error'); return; }
  const cu = budgetCurrentUser();
  const list = getBudgetDemandes();
  list.push({
    id: genId(), employeId: cu.employeId, employeNom: cu.employeNom,
    enveloppeId: env ? env.id : '', enveloppeNom: env ? env.nom : '',
    montant, motif, dateDepense,
    justificatifs: window._pendingBudgetFiles,
    statut: 'en_attente', dateDemande: new Date().toISOString()
  });
  setBudgetDemandes(list);
  if (typeof auditLog === 'function') auditLog('budget_demande', `Nouvelle demande — ${cu.employeNom} — ${budgetFmtMontant(montant)}`);
  toast('Demande de remboursement envoyée ✓', 'success');
  window._pendingBudgetFiles = [];
  closeModal('modalBudgetDemande');
  renderBudget();
}

// ── VALIDATION / REFUS ──
function repondreBudgetDemande(id, statut) {
  const list = getBudgetDemandes();
  const item = list.find(d => d.id === id);
  if (!item) return;
  if (statut === 'refuse') {
    const motif = prompt('Motif du refus :');
    if (motif === null) return;
    item.reponseMotif = motif.trim() || '';
  } else {
    item.reponseMotif = '';
  }
  item.statut = statut;
  item.traitePar = (() => { const s = Auth.getSession(); return s ? [s.prenom, s.nom].filter(Boolean).join(' ') || s.username : ''; })();
  item.dateTraitement = new Date().toISOString();
  setBudgetDemandes(list);
  toast('Demande ' + (statut === 'accepte' ? 'acceptée' : 'refusée'), 'success');
  if (typeof auditLog === 'function') auditLog('budget_' + statut, item.employeNom + ' — ' + budgetFmtMontant(item.montant));
  renderBudget();
}

function supprimerBudgetDemande(id) {
  if (!confirm('Supprimer cette demande ?')) return;
  let list = getBudgetDemandes();
  list = list.filter(d => d.id !== id);
  setBudgetDemandes(list);
  toast('Demande supprimée', 'info');
  renderBudget();
}

// ── JUSTIFICATIFS ──
function voirJustificatif(demandeId, idx) {
  const d = getBudgetDemandes().find(x => x.id === demandeId);
  const j = d?.justificatifs?.[idx];
  if (!j) return;
  document.getElementById('bgJustifTitle').textContent = j.name;
  const body = document.getElementById('bgJustifBody');
  if ((j.mimeType || '').startsWith('image/')) {
    body.innerHTML = `<img src="${j.data}" alt="${escHtml(j.name)}" style="max-width:100%;border-radius:8px"/>`;
  } else {
    body.innerHTML = `<div style="padding:1.5rem"><div style="font-size:2.2rem;margin-bottom:.5rem">📎</div><p>${escHtml(j.name)}</p><a href="${j.data}" download="${escHtml(j.name)}" class="btn btn-primary">⬇ Télécharger</a></div>`;
  }
  openModal('modalBudgetJustif');
}

// ── AFFICHAGE D'UNE DEMANDE ──
function budgetItemHtml(d, isAdmin) {
  const st = BUDGET_STATUT_STYLES[d.statut] || BUDGET_STATUT_STYLES.en_attente;
  const canRepondre = isAdmin && d.statut === 'en_attente';
  const justifs = (d.justificatifs || []).map((j, i) => `<button class="btn btn-outline btn-sm" style="font-size:.7rem;padding:1px 8px" onclick="voirJustificatif('${d.id}',${i})">📎 ${escHtml(j.name)}</button>`).join(' ');
  return `<div style="display:flex;align-items:flex-start;gap:.75rem;padding:.85rem 1rem;background:#fff;border-radius:10px;margin-bottom:6px;box-shadow:0 2px 6px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04)">
    <span style="font-size:1.2rem;margin-top:2px;flex-shrink:0">💶</span>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
        <span style="font-weight:600;font-size:.85rem">${escHtml(d.employeNom)}</span>
        <span style="padding:1px 8px;border-radius:99px;font-size:.68rem;font-weight:700;background:${st.bg};color:${st.c}">${st.l}</span>
        <span style="font-weight:700;font-size:.85rem">${budgetFmtMontant(d.montant)}</span>
        ${d.enveloppeNom ? `<span style="font-size:.7rem;color:var(--g400)">${escHtml(d.enveloppeNom)}</span>` : ''}
      </div>
      <div style="font-size:.76rem;color:var(--muted);margin-top:.2rem">
        Dépense du ${formatDate(d.dateDepense)} · Demandé le ${new Date(d.dateDemande).toLocaleDateString('fr-FR')}
      </div>
      ${d.motif ? `<div style="font-size:.75rem;color:var(--g600);margin-top:.25rem">${escHtml(d.motif)}</div>` : ''}
      ${justifs ? `<div style="margin-top:.4rem;display:flex;gap:.35rem;flex-wrap:wrap">${justifs}</div>` : ''}
      ${d.statut === 'refuse' && d.reponseMotif ? `<div style="font-size:.73rem;color:var(--red);margin-top:.15rem">Motif du refus : ${escHtml(d.reponseMotif)}</div>` : ''}
      ${d.traitePar ? `<div style="font-size:.7rem;color:var(--muted);margin-top:.1rem">Traité par ${escHtml(d.traitePar)}</div>` : ''}
    </div>
    <div style="display:flex;gap:.25rem;flex-shrink:0">
      ${canRepondre ? `<button class="btn btn-ghost btn-sm" style="color:#16a34a;font-size:.72rem;padding:2px 10px" onclick="repondreBudgetDemande('${d.id}','accepte')">✅ Accepter</button>
      <button class="btn btn-ghost btn-sm" style="color:#ef4444;font-size:.72rem;padding:2px 10px" onclick="repondreBudgetDemande('${d.id}','refuse')">❌ Refuser</button>` : ''}
      ${isAdmin ? `<button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="supprimerBudgetDemande('${d.id}')">✕</button>` : ''}
    </div>
  </div>`;
}

// ── RENDU PRINCIPAL ──
function renderBudget() {
  const isAdmin = Auth.isAdmin();
  const cu = budgetCurrentUser();
  const list = getBudgetDemandes();
  const enveloppes = getBudgetEnveloppes();

  const envSel = document.getElementById('bgFiltreEnveloppe');
  if (envSel) {
    const current = envSel.value;
    envSel.innerHTML = '<option value="">Toutes les enveloppes</option>' + enveloppes.map(e => `<option value="${e.id}">${escHtml(e.nom)}</option>`).join('');
    envSel.value = current;
  }

  if (isAdmin) {
    const empSel = document.getElementById('bgFiltreEmploye');
    if (empSel) {
      const current = empSel.value;
      const employesMap = new Map();
      list.forEach(d => { if (d.employeId && !employesMap.has(d.employeId)) employesMap.set(d.employeId, d.employeNom); });
      empSel.innerHTML = '<option value="">Tous les employés</option>' + Array.from(employesMap.entries()).map(([id, nom]) => `<option value="${id}">${escHtml(nom)}</option>`).join('');
      empSel.value = current;
    }
  }

  const filtreStatut = document.getElementById('bgFiltreStatut')?.value || '';
  const filtreEnveloppe = document.getElementById('bgFiltreEnveloppe')?.value || '';
  const filtreEmploye = document.getElementById('bgFiltreEmploye')?.value || '';

  let filtered = list;
  if (!isAdmin) filtered = filtered.filter(d => d.employeId === cu.employeId);
  if (filtreStatut) filtered = filtered.filter(d => d.statut === filtreStatut);
  if (filtreEnveloppe) filtered = filtered.filter(d => d.enveloppeId === filtreEnveloppe);
  if (isAdmin && filtreEmploye) filtered = filtered.filter(d => d.employeId === filtreEmploye);

  const statsSource = isAdmin ? list : list.filter(d => d.employeId === cu.employeId);
  const enAttente = statsSource.filter(d => d.statut === 'en_attente');
  const acceptes = statsSource.filter(d => d.statut === 'accepte');
  const refuses = statsSource.filter(d => d.statut === 'refuse');
  const totalAccepte = acceptes.reduce((s, d) => s + (Number(d.montant) || 0), 0);

  document.getElementById('bgStatEnAttente').textContent = enAttente.length;
  document.getElementById('bgStatAcceptes').textContent = acceptes.length;
  document.getElementById('bgStatRefuses').textContent = refuses.length;
  document.getElementById('bgStatTotal').textContent = budgetFmtMontant(totalAccepte);

  const pendingCard = document.getElementById('bgPendingCard');
  if (pendingCard) {
    const allEnAttente = list.filter(d => d.statut === 'en_attente');
    if (isAdmin && allEnAttente.length) {
      pendingCard.style.display = '';
      document.getElementById('bgPendingList').innerHTML = allEnAttente
        .sort((a, b) => (a.dateDemande || '').localeCompare(b.dateDemande || ''))
        .map(d => budgetItemHtml(d, isAdmin)).join('');
    } else {
      pendingCard.style.display = 'none';
    }
  }

  renderEnveloppes();

  const el = document.getElementById('bgList');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty" style="padding:3rem;text-align:center"><p>Aucune demande de budget trouvée.</p></div>';
    return;
  }
  el.innerHTML = filtered.sort((a, b) => (b.dateDemande || '').localeCompare(a.dateDemande || '')).map(d => budgetItemHtml(d, isAdmin)).join('');
}

document.addEventListener('DOMContentLoaded', initBudget);
if (typeof registerPageInit === 'function') registerPageInit('budget', initBudget);
