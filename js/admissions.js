const ADM_STATUT_LABELS = {
  en_attente: 'En attente',
  etude: 'En étude',
  admis: 'Admis',
  refuse: 'Refusé',
  abandon: 'Désistement'
};
const ADM_STATUT_COLORS = {
  en_attente: '#d97706',
  etude: '#0284c7',
  admis: '#16a34a',
  refuse: '#dc2626',
  abandon: '#6b7280'
};

// Source = Supabase. Cache mémoire chargé au démarrage.
let _admCache = [];
function getAdmissions() { return _admCache; }
async function loadAdmissionsCache() { _admCache = await sbGetAdmissions(); }

function openAdmissionModal(id) {
  const isAdmin = Auth.isAdmin();
  document.getElementById('admModalTitle').textContent = id ? '📥 Modifier la demande' : '📥 Nouvelle demande d\'admission';
  document.getElementById('admDeleteBtn').style.display = (id && isAdmin) ? '' : 'none';
  document.getElementById('admDeleteBtn').dataset.id = id || '';
  document.getElementById('modalAdmission').dataset.id = id || '';

  if (id) {
    const a = getAdmissions().find(x => x.id === id);
    if (!a) return;
    document.getElementById('admFormPrenom').value = a.prenom || '';
    document.getElementById('admFormNom').value = a.nom || '';
    document.getElementById('admFormDateNaissance').value = a.dateNaissance || '';
    document.getElementById('admFormDateDemande').value = a.dateDemande || '';
    document.getElementById('admFormOrigine').value = a.origine || 'MDPH';
    document.getElementById('admFormStatut').value = a.statut || 'en_attente';
    document.getElementById('admFormDateEntree').value = a.dateEntree || '';
    document.getElementById('admFormDossier').value = a.dossier || '';
    document.getElementById('admFormContactNom').value = a.contactNom || '';
    document.getElementById('admFormContactTel').value = a.contactTel || '';
    document.getElementById('admFormNotes').value = a.notes || '';
  } else {
    document.getElementById('admFormPrenom').value = '';
    document.getElementById('admFormNom').value = '';
    document.getElementById('admFormDateNaissance').value = '';
    document.getElementById('admFormDateDemande').value = today();
    document.getElementById('admFormOrigine').value = 'MDPH';
    document.getElementById('admFormStatut').value = 'en_attente';
    document.getElementById('admFormDateEntree').value = '';
    document.getElementById('admFormDossier').value = '';
    document.getElementById('admFormContactNom').value = '';
    document.getElementById('admFormContactTel').value = '';
    document.getElementById('admFormNotes').value = '';
  }
  openModal('modalAdmission');
}

async function saveAdmission() {
  const prenom = document.getElementById('admFormPrenom').value.trim();
  const nom = document.getElementById('admFormNom').value.trim();
  if (!prenom && !nom) { toast('Le nom ou prénom est requis', 'error'); return; }

  const data = {
    prenom, nom,
    dateNaissance: document.getElementById('admFormDateNaissance').value,
    dateDemande: document.getElementById('admFormDateDemande').value,
    dateEntree: document.getElementById('admFormDateEntree').value,
    dossier: document.getElementById('admFormDossier').value.trim(),
    origine: document.getElementById('admFormOrigine').value,
    statut: document.getElementById('admFormStatut').value,
    contactNom: document.getElementById('admFormContactNom').value.trim(),
    contactTel: document.getElementById('admFormContactTel').value.trim(),
    notes: document.getElementById('admFormNotes').value.trim()
  };

  const id = document.getElementById('modalAdmission').dataset.id;
  try {
    if (id) {
      const old = _admCache.find(a => a.id === id) || {};
      const saved = await sbSaveAdmission({ ...old, ...data, id });
      _admCache = _admCache.map(a => a.id === id ? saved : a);
      toast('Demande mise à jour');
      if (typeof auditLog === 'function') auditLog('admission_update', `${prenom} ${nom}`);
    } else {
      const saved = await sbSaveAdmission(data);
      _admCache.push(saved);
      toast('Demande ajoutée');
      if (typeof auditLog === 'function') auditLog('admission_create', `${prenom} ${nom}`);
    }
  } catch (e) { console.error('[saveAdmission]', e); toast('Erreur : ' + (e?.message || e), 'error'); return; }
  closeModal('modalAdmission');
  renderAdmissions();
}

function supprimerAdmission(id) {
  id = id || document.getElementById('admDeleteBtn').dataset.id;
  if (!id) return;
  if (!confirm('Supprimer cette demande ?')) return;
  const a = _admCache.find(x => x.id === id);
  (async () => {
    try { await sbDeleteAdmission(id); _admCache = _admCache.filter(x => x.id !== id); }
    catch (e) { console.error('[supprimerAdmission]', e); toast('Erreur suppression : ' + (e?.message || e), 'error'); return; }
    if (typeof auditLog === 'function' && a) auditLog('admission_delete', `${a.prenom} ${a.nom}`);
    toast('Demande supprimée', 'info');
    closeModal('modalAdmission');
    renderAdmissions();
  })();
}

async function admettreCandidat(id) {
  const list = getAdmissions();
  const a = list.find(x => x.id === id);
  if (!a) return;
  if (!confirm(`Admettre ${a.prenom} ${a.nom} comme résident ?`)) return;

  // Lecture depuis Supabase (uniquement pour choisir une couleur d'avatar)
  const residents = await sbGetResidents();
  const colors = ['#3b82f6', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0d9488', '#db2777'];
  // Pas de champ id : Supabase génère l'identifiant (insert)
  const resident = {
    nom: a.nom, prenom: a.prenom, photo: null,
    dob: a.dateNaissance || '',
    genre: '', entree: a.dateEntree || today(),
    statut: 'permanent', chambre: '', referent: '',
    color: colors[residents.length % colors.length],
    notes: a.notes || '', contacts: a.contactNom ? `${a.contactNom}${a.contactTel ? ' — ' + a.contactTel : ''}` : '',
    objectifs: [], medecin: '', medecinTel: '', allergies: '', nss: '', ins: '',
    dmp: '', dmpDate: '', consent: '', consentDate: '',
    tuteur: '', tuteurTel: '', ecole: '', classe: '',
    organisme: a.origine || '', dossier: '', situationPro: '', ressources: '',
    organismeA: '', dossierA: '', situationAdmin: '', protection: ''
  };
  let saved;
  try {
    saved = await sbSaveResident(resident);
  } catch (e) {
    console.error(e);
    toast('Erreur lors de la création de la fiche résident', 'error');
    return;
  }

  try {
    const saved2 = await sbSaveAdmission({ ...a, statut: 'admis', dateDecision: today(), residentId: saved.id });
    _admCache = _admCache.map(x => x.id === id ? saved2 : x);
  } catch (e) { console.error('[admettreCandidat]', e); toast('Fiche créée mais erreur de mise à jour de la demande', 'error'); }

  if (typeof auditLog === 'function') auditLog('admission_admis', `${a.prenom} ${a.nom}`);
  toast(`${a.prenom} ${a.nom} admis(e) — fiche résident créée`, 'success');
  renderAdmissions();
}

// Injecte le CSS de la frise d'admission depuis le JS (cache-proof).
function ensureAdmUI() {
  if (typeof document === 'undefined' || document.getElementById('adm-parcours-styles')) return;
  const s = document.createElement('style');
  s.id = 'adm-parcours-styles';
  s.textContent = `
    .adm-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:.9rem 1.1rem;margin-bottom:.7rem;cursor:pointer;transition:box-shadow .15s,border-color .15s}
    .adm-card:hover{box-shadow:0 4px 14px rgba(15,43,74,.08);border-color:#cbd5e1}
    .adm-top{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.9rem}
    .adm-ava{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.72rem;color:#fff;flex-shrink:0}
    .adm-name{font-weight:700;font-size:.92rem;color:#1e293b}
    .adm-sub{font-size:.72rem;color:#64748b}
    .adm-badge{font-size:.68rem;font-weight:700;padding:2px 9px;border-radius:999px}
    .adm-next{font-size:.72rem;color:#0369a1;background:#e0f2fe;border-radius:8px;padding:4px 10px;white-space:nowrap}
    .adm-steps{display:flex;align-items:flex-start;overflow-x:auto;padding-bottom:2px}
    .adm-step{display:flex;flex-direction:column;align-items:center;flex:0 0 auto;width:78px;text-align:center}
    .adm-dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800;flex-shrink:0}
    .adm-dot.done{background:#16a34a;color:#fff}
    .adm-dot.inprogress{background:#0284c7;color:#fff;box-shadow:0 0 0 4px rgba(2,132,199,.2)}
    .adm-dot.next{background:#fff;border:2px dashed #0284c7}
    .adm-dot.todo{background:#fff;border:2px solid #e2e8f0}
    .adm-dot.term{color:#fff}
    .adm-slbl{font-size:.66rem;margin-top:.35rem;line-height:1.2;color:#94a3b8}
    .adm-slbl.on{color:#334155;font-weight:700}
    .adm-sdate{font-size:.62rem;color:#94a3b8;margin-top:1px}
    .adm-conn{flex:1 1 auto;height:2px;margin-top:10px;min-width:14px;border-radius:2px;background:#e2e8f0}
    .adm-foot{font-size:.72rem;color:#64748b;margin-top:.8rem;line-height:1.55}
    .adm-foot b{color:#475569;font-weight:600}`;
  document.head.appendChild(s);
}

// Calcule l'avancement du dossier à partir du statut + des dates existantes.
function admParcours(a) {
  const stages = [
    { label:'Demande',  date: a.dateDemande },
    { label:'En étude', date: null },
    { label:'Admis',    date: a.dateDecision },
    { label:'Entrée',   date: a.dateEntree }
  ];
  if (a.statut === 'refuse')  return { stages, terminal:{ label:'Refusé',      color:'#dc2626', icon:'✕' }, next:'' };
  if (a.statut === 'abandon') return { stages, terminal:{ label:'Désistement', color:'#6b7280', icon:'–' }, next:'' };
  const entered = a.statut === 'admis' && a.residentId && a.dateEntree && a.dateEntree <= today();
  if (a.statut === 'en_attente') return { stages, doneCount:1, activeIndex:1, activeMode:'next',       next:'Étudier le dossier' };
  if (a.statut === 'etude')      return { stages, doneCount:1, activeIndex:1, activeMode:'inprogress', next:'Statuer sur l\'admission' };
  if (a.statut === 'admis' && !entered) return { stages, doneCount:3, activeIndex:3, activeMode:'next', next: a.dateEntree ? 'Entrée prévue le ' + formatDate(a.dateEntree) : 'Planifier l\'entrée' };
  return { stages, doneCount:4, activeIndex:-1, activeMode:null, next:'Résident entré' };
}

function admissionItemHtml(a, isAdmin) {
  const color = ADM_STATUT_COLORS[a.statut] || '#6b7280';
  const label = ADM_STATUT_LABELS[a.statut] || a.statut;
  const nom = `${a.prenom || ''} ${a.nom || ''}`.trim();
  const ini = (nom.split(' ').map(w => w[0] || '').join('').slice(0, 2)).toUpperCase();
  const par = admParcours(a);

  let steps;
  if (par.terminal) {
    steps = `<div class="adm-step">
        <div class="adm-dot done">✓</div>
        <div class="adm-slbl on">Demande</div>
        ${a.dateDemande ? `<div class="adm-sdate">${formatDate(a.dateDemande)}</div>` : ''}
      </div>
      <div class="adm-conn" style="background:${par.terminal.color}"></div>
      <div class="adm-step">
        <div class="adm-dot term" style="background:${par.terminal.color}">${par.terminal.icon}</div>
        <div class="adm-slbl on" style="color:${par.terminal.color}">${par.terminal.label}</div>
      </div>`;
  } else {
    steps = par.stages.map((s, i) => {
      const state = i < par.doneCount ? 'done' : (i === par.activeIndex ? par.activeMode : 'todo');
      const inner = state === 'done' ? '✓' : (state === 'inprogress' ? '●' : '');
      const node = `<div class="adm-step">
        <div class="adm-dot ${state}">${inner}</div>
        <div class="adm-slbl ${state === 'todo' ? '' : 'on'}">${escHtml(s.label)}</div>
        ${s.date ? `<div class="adm-sdate">${formatDate(s.date)}</div>` : ''}
      </div>`;
      const conn = i < par.stages.length - 1
        ? `<div class="adm-conn"${(i + 1) <= par.doneCount ? ' style="background:#16a34a"' : ''}></div>`
        : '';
      return node + conn;
    }).join('');
  }

  const foot = [];
  if (a.origine)    foot.push(`<b>Orientation</b> ${escHtml(a.origine)}`);
  if (a.dossier)    foot.push(`<b>Dossier</b> ${escHtml(a.dossier)}`);
  if (a.contactNom) foot.push(`<b>Contact</b> ${escHtml(a.contactNom)}${a.contactTel ? ' (' + escHtml(a.contactTel) + ')' : ''}`);
  const showAdmettre = isAdmin && !['admis', 'refuse', 'abandon'].includes(a.statut);

  return `<div class="adm-card" onclick="openAdmissionModal('${a.id}')">
    <div class="adm-top">
      <div class="adm-ava" style="background:${color}">${ini || '?'}</div>
      <div style="min-width:0">
        <div class="adm-name">${escHtml(nom) || '—'}</div>
        <div class="adm-sub">${a.dateNaissance ? 'Né(e) le ' + formatDate(a.dateNaissance) + ' · ' + age(a.dateNaissance) : ''}</div>
      </div>
      <span class="adm-badge" style="background:${color}20;color:${color}">${escHtml(label)}</span>
      <div style="margin-left:auto;display:flex;align-items:center;gap:.5rem" onclick="event.stopPropagation()">
        ${par.next ? `<span class="adm-next">→ ${escHtml(par.next)}</span>` : ''}
        ${showAdmettre ? `<button class="btn btn-outline btn-sm" onclick="admettreCandidat('${a.id}')">✓ Admettre</button>` : ''}
      </div>
    </div>
    <div class="adm-steps">${steps}</div>
    ${foot.length ? `<div class="adm-foot">${foot.join(' &nbsp;·&nbsp; ')}</div>` : ''}
    ${a.notes ? `<div class="adm-foot" style="font-style:italic;margin-top:.35rem">${escHtml(a.notes)}</div>` : ''}
  </div>`;
}

function renderAdmissions() {
  ensureAdmUI();
  const isAdmin = Auth.isAdmin();
  const list = getAdmissions();
  const q = (document.getElementById('admSearch')?.value || '').trim().toLowerCase();
  const statut = document.getElementById('admFiltreStatut')?.value || '';

  document.getElementById('admStatEnAttente').textContent = list.filter(a => a.statut === 'en_attente').length;
  document.getElementById('admStatEtude').textContent = list.filter(a => a.statut === 'etude').length;
  document.getElementById('admStatAdmis').textContent = list.filter(a => a.statut === 'admis').length;
  document.getElementById('admStatTotal').textContent = list.length;

  let filtered = list;
  if (q) filtered = filtered.filter(a => `${a.prenom} ${a.nom}`.toLowerCase().includes(q));
  if (statut) filtered = filtered.filter(a => a.statut === statut);

  const el = document.getElementById('admList');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty" style="padding:3rem;text-align:center"><p>Aucune demande d\'admission</p></div>';
    return;
  }
  el.innerHTML = filtered
    .sort((a, b) => (b.dateDemande || '').localeCompare(a.dateDemande || ''))
    .map(a => admissionItemHtml(a, isAdmin)).join('');
}

document.addEventListener('DOMContentLoaded', async () => { if (requireModule('access_admissions')) { await loadAdmissionsCache(); renderAdmissions(); } });
if (typeof registerPageInit === 'function') registerPageInit('admissions', async () => { await loadAdmissionsCache(); renderAdmissions(); });
