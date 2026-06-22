const FORMATION_DOMAINES = [
  "Sécurité & gestes d'urgence",
  'Accompagnement éducatif & pédagogique',
  'Communication & gestion des conflits',
  'Hygiène, santé & soins',
  'Réglementation & droit des usagers',
  'Numérique & outils professionnels',
  'Management & encadrement',
  'Autre'
];
const FORMATION_STATUT_LABELS = { planifiee: 'Planifiée', realisee: 'Réalisée', annulee: 'Annulée' };
const FORMATION_STATUT_COLORS = { planifiee: '#d97706', realisee: '#16a34a', annulee: '#9ca3af' };

function getFormations() { return DB.get(DB.keys.formations) || []; }
function setFormations(d) { DB.set(DB.keys.formations, d); }

function frmEur(n) { return (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }

function openFormationModal(id) {
  const isAdmin = Auth.isAdmin();
  if (id && !isAdmin) return;
  const employes = (DB.get(DB.keys.employes) || []).filter(e => e.statut !== 'inactif');
  const list = getFormations();
  const f = id ? list.find(x => x.id === id) : null;

  document.getElementById('frmModalTitle').textContent = f ? '✎ Modifier la formation' : '🎓 Nouvelle formation';
  document.getElementById('frmDeleteBtn').style.display = (f && isAdmin) ? '' : 'none';
  document.getElementById('modalFormation').dataset.id = f ? f.id : '';

  document.getElementById('frmFormTitre').value = f ? f.titre : '';
  document.getElementById('frmFormOrganisme').value = f ? f.organisme || '' : '';
  document.getElementById('frmFormDomaine').value = f ? f.domaine : FORMATION_DOMAINES[0];
  document.getElementById('frmFormDateDebut').value = f ? f.dateDebut : today();
  document.getElementById('frmFormDateFin').value = f ? f.dateFin || '' : '';
  document.getElementById('frmFormDuree').value = f ? f.dureeHeures || '' : '';
  document.getElementById('frmFormCout').value = f ? f.cout || '' : '';
  document.getElementById('frmFormMax').value = f ? f.maxParticipants || '' : '';
  document.getElementById('frmFormStatut').value = f ? f.statut : 'planifiee';
  document.getElementById('frmFormNotes').value = f ? f.notes || '' : '';

  const participants = f ? (f.participants || []) : [];
  document.getElementById('frmFormParticipants').innerHTML = employes.length
    ? employes.map(e => `<label style="display:flex;align-items:center;gap:.4rem;font-size:.82rem;font-weight:400;text-transform:none;letter-spacing:0;margin:0">
        <input type="checkbox" value="${e.id}" style="width:auto"${participants.includes(e.id) ? ' checked' : ''}/> ${escHtml(e.prenom)} ${escHtml(e.nom)}
      </label>`).join('')
    : '<div style="font-size:.78rem;color:var(--muted)">Aucun employé enregistré</div>';

  openModal('modalFormation');
}

function saveFormation() {
  if (!Auth.isAdmin()) { toast('Action réservée aux administrateurs', 'error'); return; }
  const titre = document.getElementById('frmFormTitre').value.trim();
  const dateDebut = document.getElementById('frmFormDateDebut').value;
  if (!titre) { toast('Intitulé requis', 'error'); return; }
  if (!dateDebut) { toast('Date de début requise', 'error'); return; }

  const participants = [...document.querySelectorAll('#frmFormParticipants input[type=checkbox]:checked')].map(c => c.value);

  const data = {
    titre,
    organisme: document.getElementById('frmFormOrganisme').value.trim(),
    domaine: document.getElementById('frmFormDomaine').value,
    dateDebut,
    dateFin: document.getElementById('frmFormDateFin').value,
    dureeHeures: parseFloat(document.getElementById('frmFormDuree').value) || 0,
    cout: parseFloat(document.getElementById('frmFormCout').value) || 0,
    maxParticipants: parseInt(document.getElementById('frmFormMax').value) || null,
    statut: document.getElementById('frmFormStatut').value,
    participants,
    notes: document.getElementById('frmFormNotes').value.trim(),
    updatedAt: new Date().toISOString()
  };

  let list = getFormations();
  const id = document.getElementById('modalFormation').dataset.id;
  if (id) {
    list = list.map(f => f.id === id ? { ...f, ...data } : f);
    toast('Formation mise à jour');
    if (typeof auditLog === 'function') auditLog('formation_update', titre);
  } else {
    data.id = genId();
    data.createdAt = new Date().toISOString();
    list.push(data);
    toast('Formation ajoutée');
    if (typeof auditLog === 'function') auditLog('formation_create', titre);
  }
  setFormations(list);
  closeModal('modalFormation');
  renderFormations();
}

function supprimerFormation(id) {
  if (!Auth.isAdmin()) { toast('Action réservée aux administrateurs', 'error'); return; }
  id = id || document.getElementById('modalFormation').dataset.id;
  if (!id) return;
  if (!confirm('Supprimer cette formation ?')) return;
  setFormations(getFormations().filter(f => f.id !== id));
  toast('Formation supprimée', 'info');
  closeModal('modalFormation');
  renderFormations();
}

function frmCurrentEmployeId() {
  const session = Auth.getSession();
  if (!session) return null;
  const users = DB.get(DB.keys.users) || [];
  const user = users.find(u => String(u.id) === String(session.userId));
  const prenom = user?.prenom || session.prenom || '';
  const nom = user?.nom || session.nom || '';
  const employes = DB.get(DB.keys.employes) || [];
  const emp = employes.find(e => prenom && nom && e.prenom === prenom && e.nom === nom);
  return emp ? emp.id : null;
}

function frmInscrire(id) {
  const empId = frmCurrentEmployeId();
  if (!empId) { toast('Votre profil employé est introuvable', 'error'); return; }
  const list = getFormations();
  const f = list.find(x => x.id === id);
  if (!f) return;
  const parts = f.participants || [];
  if (parts.includes(empId)) { toast('Vous êtes déjà inscrit', 'info'); return; }
  if (f.maxParticipants && parts.length >= f.maxParticipants) { toast('Nombre maximum de participants atteint', 'error'); return; }
  f.participants = [...parts, empId];
  setFormations(list);
  if (typeof auditLog === 'function') auditLog('formation_inscription', f.titre);
  toast('Inscription confirmée', 'success');
  renderFormations();
}

function frmDesinscrire(id) {
  const empId = frmCurrentEmployeId();
  if (!empId) return;
  const list = getFormations();
  const f = list.find(x => x.id === id);
  if (!f) return;
  f.participants = (f.participants || []).filter(p => p !== empId);
  setFormations(list);
  if (typeof auditLog === 'function') auditLog('formation_desinscription', f.titre);
  toast('Désinscription effectuée', 'info');
  renderFormations();
}

function formationItemHtml(f, isAdmin, employesMap) {
  const color = FORMATION_STATUT_COLORS[f.statut] || '#6b7280';
  const label = FORMATION_STATUT_LABELS[f.statut] || f.statut;
  const parts = f.participants || [];
  const noms = parts.map(id => employesMap.get(id)).filter(Boolean);

  // Bouton inscription (non-admins uniquement)
  let inscriptionBtn = '';
  if (!isAdmin && f.statut === 'planifiee') {
    const dateRef = f.dateFin || f.dateDebut;
    const datePassed = dateRef && dateRef < new Date().toISOString().slice(0, 10);
    const empId = frmCurrentEmployeId();
    const alreadyIn = empId && parts.includes(empId);
    const full = f.maxParticipants && parts.length >= f.maxParticipants && !alreadyIn;

    if (datePassed) {
      inscriptionBtn = `<span style="font-size:.75rem;color:var(--muted);font-style:italic">Formation terminée</span>`;
    } else if (alreadyIn) {
      inscriptionBtn = `<button onclick="event.stopPropagation();frmDesinscrire('${f.id}')" style="background:#dcfce7;color:#16a34a;border:1.5px solid #16a34a40;border-radius:8px;padding:.3rem .85rem;font-size:.78rem;font-weight:600;cursor:pointer">✓ Inscrit · Se désinscrire</button>`;
    } else if (full) {
      inscriptionBtn = `<span style="background:#f1f5f9;color:#94a3b8;border:1.5px solid #e2e8f0;border-radius:8px;padding:.3rem .85rem;font-size:.78rem;font-weight:600">Complet (${parts.length}/${f.maxParticipants})</span>`;
    } else {
      const placesTxt = f.maxParticipants ? ` · ${parts.length}/${f.maxParticipants} place${f.maxParticipants > 1 ? 's' : ''}` : '';
      inscriptionBtn = `<button onclick="event.stopPropagation();frmInscrire('${f.id}')" style="background:#0f2b4a;color:#fff;border:none;border-radius:8px;padding:.3rem .85rem;font-size:.78rem;font-weight:600;cursor:pointer">S'inscrire${placesTxt}</button>`;
    }
  }

  const maxTxt = isAdmin && f.maxParticipants ? ` · max ${f.maxParticipants}` : '';

  return `<div style="padding:.85rem 1rem;background:#fff;border-radius:10px;margin-bottom:6px;box-shadow:0 2px 6px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04)${isAdmin ? ';cursor:pointer' : ''}" ${isAdmin ? `onclick="openFormationModal('${f.id}')"` : ''}>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
        <span style="font-weight:600;font-size:.85rem">${escHtml(f.titre)}</span>
        <span class="badge" style="background:${color}20;color:${color}">${escHtml(label)}</span>
        <span class="badge badge-gray">${escHtml(f.domaine)}</span>
      </div>
      ${inscriptionBtn ? `<div style="flex-shrink:0">${inscriptionBtn}</div>` : ''}
    </div>
    <div style="font-size:.74rem;color:var(--muted);margin-top:.2rem">
      ${formatDate(f.dateDebut)}${f.dateFin && f.dateFin !== f.dateDebut ? ' → ' + formatDate(f.dateFin) : ''}
      ${f.organisme ? ' · ' + escHtml(f.organisme) : ''}
      ${f.dureeHeures ? ' · ' + f.dureeHeures + ' h' : ''}
      ${f.cout ? ' · ' + frmEur(f.cout) : ''}${maxTxt}
    </div>
    ${noms.length ? `<div style="font-size:.74rem;color:var(--g600);margin-top:.3rem"><strong>Participants (${parts.length}${f.maxParticipants ? '/'+f.maxParticipants : ''}) :</strong> ${noms.map(escHtml).join(', ')}</div>` : ''}
    ${f.notes ? `<div style="font-size:.74rem;color:var(--muted);margin-top:.2rem">${escHtml(f.notes)}</div>` : ''}
  </div>`;
}

function renderFormations() {
  const isAdmin = Auth.isAdmin();
  const list = getFormations();
  const employes = DB.get(DB.keys.employes) || [];
  const employesMap = new Map(employes.map(e => [e.id, `${e.prenom} ${e.nom}`]));

  // Filtre année
  const anneeSel = document.getElementById('frmFiltreAnnee');
  if (anneeSel) {
    const annees = [...new Set(list.map(f => (f.dateDebut || '').slice(0, 4)).filter(Boolean))].sort().reverse();
    const current = anneeSel.value;
    anneeSel.innerHTML = '<option value="">Toutes les années</option>' + annees.map(a => `<option value="${a}"${current === a ? ' selected' : ''}>${a}</option>`).join('');
  }
  // Filtre domaine
  const domaineSel = document.getElementById('frmFiltreDomaine');
  if (domaineSel) {
    const current = domaineSel.value;
    domaineSel.innerHTML = '<option value="">Tous les domaines</option>' + FORMATION_DOMAINES.map(d => `<option value="${escHtml(d)}"${current === d ? ' selected' : ''}>${escHtml(d)}</option>`).join('');
  }

  const annee = document.getElementById('frmFiltreAnnee')?.value || '';
  const domaine = document.getElementById('frmFiltreDomaine')?.value || '';
  const statut = document.getElementById('frmFiltreStatut')?.value || '';

  let filtered = list;
  if (annee) filtered = filtered.filter(f => (f.dateDebut || '').startsWith(annee));
  if (domaine) filtered = filtered.filter(f => f.domaine === domaine);
  if (statut) filtered = filtered.filter(f => f.statut === statut);

  document.getElementById('frmStatPlanifiees').textContent = filtered.filter(f => f.statut === 'planifiee').length;
  document.getElementById('frmStatRealisees').textContent = filtered.filter(f => f.statut === 'realisee').length;
  document.getElementById('frmStatParticipants').textContent = filtered.reduce((a, f) => a + (f.participants || []).length, 0);
  document.getElementById('frmStatBudget').textContent = frmEur(filtered.filter(f => f.statut !== 'annulee').reduce((a, f) => a + (f.cout || 0), 0));

  const el = document.getElementById('frmList');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty" style="padding:3rem;text-align:center"><p>Aucune formation trouvée.</p></div>';
    return;
  }
  el.innerHTML = filtered
    .sort((a, b) => (b.dateDebut || '').localeCompare(a.dateDebut || ''))
    .map(f => formationItemHtml(f, isAdmin, employesMap)).join('');
}

document.addEventListener('DOMContentLoaded', () => { if (requireModule('access_formations')) renderFormations(); });
if (typeof registerPageInit === 'function') registerPageInit('formations', renderFormations);
