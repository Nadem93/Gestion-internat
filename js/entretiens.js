const ENTRETIEN_TYPE_LABELS = { annuel: 'Entretien annuel', professionnel: 'Entretien professionnel', suivi: 'Entretien de suivi' };
const ENTRETIEN_STATUT_STYLES = { planifie: { bg: '#d9770618', c: '#d97706', l: 'Planifié' }, realise: { bg: '#16a34a18', c: '#16a34a', l: 'Réalisé' } };

function getEntretiens() { return DB.get(DB.keys.entretiens) || []; }
function setEntretiens(d) { DB.set(DB.keys.entretiens, d); }

function entretienCurrentUser() {
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

function initEntretiens() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('access_entretiens')) return;
  if (Auth.isAdmin()) {
    const empSel = document.getElementById('etFiltreEmploye');
    if (empSel) empSel.style.display = '';
  }
  renderEntretiens();
}

function openEntretienModal(id) {
  const employes = DB.get(DB.keys.employes) || [];
  const list = getEntretiens();
  const item = id ? list.find(e => e.id === id) : null;
  document.getElementById('etModalTitle').textContent = item ? '✎ Modifier l’entretien' : '🧑‍💼 Nouvel entretien';
  const sel = document.getElementById('etFormEmploye');
  sel.innerHTML = employes.map(e => `<option value="${e.id}">${escHtml(e.prenom + ' ' + e.nom)}</option>`).join('');
  if (item) sel.value = item.employeId;
  document.getElementById('etFormDate').value = item ? item.date : today();
  document.getElementById('etFormType').value = item ? item.type : 'annuel';
  document.getElementById('etFormStatut').value = item ? item.statut : 'planifie';
  document.getElementById('etFormEvaluateur').value = item ? item.evaluateur || '' : '';
  document.getElementById('etFormBilan').value = item ? item.bilan || '' : '';
  document.getElementById('etFormObjectifs').value = item ? item.objectifs || '' : '';
  document.getElementById('etFormFormations').value = item ? item.formations || '' : '';
  document.getElementById('modalEntretien').dataset.editId = item ? item.id : '';
  openModal('modalEntretien');
}

function saveEntretien() {
  const id = document.getElementById('modalEntretien').dataset.editId;
  const employeId = document.getElementById('etFormEmploye').value;
  const employes = DB.get(DB.keys.employes) || [];
  const emp = employes.find(e => e.id === employeId);
  const date = document.getElementById('etFormDate').value;
  const type = document.getElementById('etFormType').value;
  const statut = document.getElementById('etFormStatut').value;
  const evaluateur = document.getElementById('etFormEvaluateur').value.trim();
  const bilan = document.getElementById('etFormBilan').value.trim();
  const objectifs = document.getElementById('etFormObjectifs').value.trim();
  const formations = document.getElementById('etFormFormations').value.trim();
  if (!employeId || !emp) { toast('Employé requis', 'error'); return; }
  if (!date) { toast('Date requise', 'error'); return; }
  let list = getEntretiens();
  if (id) {
    list = list.map(e => e.id === id ? { ...e, employeId, employeNom: emp.prenom + ' ' + emp.nom, date, type, statut, evaluateur, bilan, objectifs, formations } : e);
    toast('Entretien mis à jour', 'success');
  } else {
    list.push({
      id: genId(), employeId, employeNom: emp.prenom + ' ' + emp.nom,
      date, type, statut, evaluateur, bilan, objectifs, formations,
      createdAt: new Date().toISOString()
    });
    toast('Entretien enregistré', 'success');
  }
  setEntretiens(list);
  if (typeof auditLog === 'function') auditLog('entretien', emp.prenom + ' ' + emp.nom + ' — ' + ENTRETIEN_TYPE_LABELS[type]);
  closeModal('modalEntretien');
  renderEntretiens();
}

function supprimerEntretien(id) {
  if (!confirm('Supprimer cet entretien ?')) return;
  let list = getEntretiens();
  list = list.filter(e => e.id !== id);
  setEntretiens(list);
  toast('Entretien supprimé', 'info');
  renderEntretiens();
}

function entretienItemHtml(e, isAdmin) {
  const st = ENTRETIEN_STATUT_STYLES[e.statut] || ENTRETIEN_STATUT_STYLES.planifie;
  return `<div style="padding:.85rem 1rem;background:#fff;border-radius:10px;margin-bottom:6px;box-shadow:0 2px 6px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04)">
    <div style="display:flex;align-items:flex-start;gap:.75rem">
      <span style="font-size:1.2rem;margin-top:2px;flex-shrink:0">🧑‍💼</span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
          ${isAdmin ? `<span style="font-weight:600;font-size:.85rem">${escHtml(e.employeNom)}</span>` : ''}
          <span style="padding:1px 8px;border-radius:99px;font-size:.68rem;font-weight:700;background:${st.bg};color:${st.c}">${st.l}</span>
          <span style="font-size:.7rem;color:var(--g400)">${ENTRETIEN_TYPE_LABELS[e.type] || e.type}</span>
        </div>
        <div style="font-size:.76rem;color:var(--muted);margin-top:.2rem">
          ${formatDate(e.date)}${e.evaluateur ? ' · Évaluateur : ' + escHtml(e.evaluateur) : ''}
        </div>
        ${e.bilan ? `<div style="font-size:.75rem;color:var(--g600);margin-top:.4rem"><strong>Bilan :</strong> ${escHtml(e.bilan)}</div>` : ''}
        ${e.objectifs ? `<div style="font-size:.75rem;color:var(--g600);margin-top:.25rem"><strong>Objectifs :</strong> ${escHtml(e.objectifs)}</div>` : ''}
        ${e.formations ? `<div style="font-size:.75rem;color:var(--g600);margin-top:.25rem"><strong>Formations :</strong> ${escHtml(e.formations)}</div>` : ''}
      </div>
      ${isAdmin ? `<div style="display:flex;gap:.25rem;flex-shrink:0">
        <button class="btn btn-ghost btn-sm" onclick="openEntretienModal('${e.id}')" title="Modifier">✎</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="supprimerEntretien('${e.id}')">✕</button>
      </div>` : ''}
    </div>
  </div>`;
}

function renderEntretiens() {
  const isAdmin = Auth.isAdmin();
  const cu = entretienCurrentUser();
  const list = getEntretiens();

  if (isAdmin) {
    const empSel = document.getElementById('etFiltreEmploye');
    if (empSel) {
      const current = empSel.value;
      const employesMap = new Map();
      list.forEach(e => { if (e.employeId && !employesMap.has(e.employeId)) employesMap.set(e.employeId, e.employeNom); });
      empSel.innerHTML = '<option value="">Tous les employés</option>' + Array.from(employesMap.entries()).map(([id, nom]) => `<option value="${id}">${escHtml(nom)}</option>`).join('');
      empSel.value = current;
    }
  }

  const filtreEmploye = isAdmin ? (document.getElementById('etFiltreEmploye')?.value || '') : '';
  const filtreType = document.getElementById('etFiltreType')?.value || '';
  const filtreStatut = document.getElementById('etFiltreStatut')?.value || '';

  let filtered = list;
  if (!isAdmin) filtered = filtered.filter(e => e.employeId === cu.employeId);
  if (filtreEmploye) filtered = filtered.filter(e => e.employeId === filtreEmploye);
  if (filtreType) filtered = filtered.filter(e => e.type === filtreType);
  if (filtreStatut) filtered = filtered.filter(e => e.statut === filtreStatut);

  const statsSource = isAdmin ? list : list.filter(e => e.employeId === cu.employeId);
  document.getElementById('etStatPlanifies').textContent = statsSource.filter(e => e.statut === 'planifie').length;
  document.getElementById('etStatRealises').textContent = statsSource.filter(e => e.statut === 'realise').length;
  document.getElementById('etStatTotal').textContent = statsSource.length;

  const el = document.getElementById('etList');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty" style="padding:3rem;text-align:center"><p>Aucun entretien trouvé.</p></div>';
    return;
  }
  el.innerHTML = filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(e => entretienItemHtml(e, isAdmin)).join('');
}

document.addEventListener('DOMContentLoaded', initEntretiens);
if (typeof registerPageInit === 'function') registerPageInit('entretiens', initEntretiens);
