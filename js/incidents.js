const INCIDENTS_KEY = 'ftr_incidents';
const INCIDENT_TYPES = {
  chute:'Chute', agression:'Agression', fugue:'Fugue / Absence inquiétante',
  violence:'Violence', medical:'Médical / Soins', materiel:'Dégât matériel',
  accident:'Accident', autre:'Autre'
};
const GRAVITE_LABELS = { leger:'Léger', moyen:'Modéré', grave:'Grave', critique:'Critique' };
const STATUT_LABELS = { declare:'Déclaré', cours:'En cours', valide:'Validé', classe:'Classé' };
const GRAVITE_CLASSES = { leger:'leger', moyen:'moyen', grave:'grave', critique:'dangere' };
const STATUT_CLASSES = { declare:'declare', cours:'cours', valide:'valide', classe:'classe' };
const INCIDENT_ICONS = {
  chute:'🦶', agression:'👊', fugue:'🚪', violence:'⚡',
  medical:'💊', materiel:'🔧', accident:'⚠️', autre:'📋'
};

function getIncidents() { return JSON.parse(localStorage.getItem(INCIDENTS_KEY) || '[]'); }
function saveIncidents(list) { localStorage.setItem(INCIDENTS_KEY, JSON.stringify(list)); }

function initIncidents() {
  const session = Auth.requireAuth();
  if (!session) return;
  populateResidentSelect();
  setDefaults();
  renderIncidents();
}

function populateResidentSelect() {
  const sel = document.getElementById('fResident');
  if (!sel) return;
  const residents = DB.get(DB.keys.residents) || [];
  sel.innerHTML = '<option value="">— Aucun —</option>' + residents.map(r =>
    `<option value="${r.id}">${escHtml(r.prenom||'')} ${escHtml(r.nom||'')}</option>`
  ).join('');
}

function setDefaults() {
  const d = document.getElementById('fDate');
  if (d && !d.value) d.value = new Date().toISOString().slice(0,10);
  const h = document.getElementById('fHeure');
  if (h && !h.value) h.value = new Date().toTimeString().slice(0,5);
}

function saveIncident() {
  const titre = document.getElementById('fTitre').value.trim();
  const type = document.getElementById('fType').value;
  const gravite = document.getElementById('fGravite').value;
  const date = document.getElementById('fDate').value;
  const heure = document.getElementById('fHeure').value;
  const residentId = document.getElementById('fResident').value;
  const lieu = document.getElementById('fLieu').value.trim();
  const description = document.getElementById('fDescription').value.trim();
  if (!titre || !description) { toast('Veuillez remplir le titre et la description', 'error'); return; }

  const residents = DB.get(DB.keys.residents) || [];
  const resident = residents.find(r => r.id === residentId);
  const session = Auth.getSession();

  const incident = {
    id: genId(),
    titre, type, gravite, date, heure,
    residentId: residentId || null,
    residentName: resident ? `${resident.prenom||''} ${resident.nom||''}`.trim() : '',
    lieu, description,
    statut: 'declare',
    declaredBy: session ? `${session.prenom||''} ${session.nom||''}`.trim() || session.username : 'Inconnu',
    declaredById: session ? session.userId : null,
    declaredAt: new Date().toISOString(),
    validatedBy: null,
    validatedById: null,
    validatedAt: null,
    notes: '',
    createdAt: new Date().toISOString()
  };

  const list = getIncidents();
  list.unshift(incident);
  saveIncidents(list);
  closeModal('modalIncident');
  toast('Incident déclaré');
  renderIncidents();
  resetForm();
}

function resetForm() {
  ['fTitre','fLieu','fDescription'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('fGravite').value = 'leger';
  document.getElementById('fType').value = 'chute';
  document.getElementById('fResident').value = '';
  setDefaults();
}

function renderIncidents() {
  const container = document.getElementById('incidentsList');
  const countEl = document.getElementById('incidentCount');
  if (!container) return;
  let list = getIncidents();
  const search = (document.getElementById('searchIncident')?.value || '').toLowerCase();
  const filterType = document.getElementById('filterType')?.value || '';
  const filterGravite = document.getElementById('filterGravite')?.value || '';
  const filterStatut = document.getElementById('filterStatut')?.value || '';
  const session = Auth.getSession();
  const isAdmin = session && session.role === 'admin';

  list = list.filter(i => {
    if (filterType && i.type !== filterType) return false;
    if (filterGravite && i.gravite !== filterGravite) return false;
    if (filterStatut && i.statut !== filterStatut) return false;
    if (!isAdmin && i.declaredById !== session?.userId) return false;
    if (search) {
      const txt = `${i.titre} ${i.residentName||''} ${i.description||''} ${i.lieu||''} ${i.declaredBy||''}`.toLowerCase();
      if (!txt.includes(search)) return false;
    }
    return true;
  });

  list.sort((a,b) => b.createdAt.localeCompare(a.createdAt));

  if (countEl) countEl.textContent = `${list.length} incident${list.length > 1 ? 's' : ''}`;

  if (!list.length) {
    container.innerHTML = '<div class="empty" style="padding:3rem"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:48px;height:48px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><p>Aucun incident à afficher</p></div>';
    return;
  }

  container.innerHTML = list.map(i => {
    const typeLabel = INCIDENT_TYPES[i.type] || i.type;
    const gravLabel = GRAVITE_LABELS[i.gravite] || i.gravite;
    const statLabel = STATUT_LABELS[i.statut] || i.statut;
    const icon = INCIDENT_ICONS[i.type] || '📋';
    const dateStr = i.date ? formatDate(i.date) : '—';
    const timeStr = i.heure ? i.heure.slice(0,5) : '';
    const canValidate = isAdmin && (i.statut === 'declare' || i.statut === 'cours');

    return `<div class="incident-card">
      <div class="top">
        <div class="incident-type-icon" style="background:${graviteColor(i.gravite)}22;color:${graviteColor(i.gravite)}">${icon}</div>
        <div class="info">
          <h3>${escHtml(i.titre)}</h3>
          <div class="meta">
            <span>📅 ${dateStr}${timeStr ? ' · '+timeStr : ''}</span>
            ${i.residentName ? `<span>👤 ${escHtml(i.residentName)}</span>` : ''}
            ${i.lieu ? `<span>📍 ${escHtml(i.lieu)}</span>` : ''}
            <span>✍️ ${escHtml(i.declaredBy)}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.3rem;flex-shrink:0">
          <span class="badge-incident ${GRAVITE_CLASSES[i.gravite]||''}">${gravLabel}</span>
          <span class="badge-status ${STATUT_CLASSES[i.statut]||''}">${statLabel}</span>
        </div>
      </div>
      ${i.description ? `<div class="desc">${escHtml(i.description)}</div>` : ''}
      ${i.notes ? `<div class="validation-tag">📎 Notes : ${escHtml(i.notes)}</div>` : ''}
      <div class="incident-actions">
        <button class="btn btn-ghost btn-sm" onclick="viewIncident('${i.id}')">Détails</button>
        ${canValidate ? `<button class="btn btn-outline btn-sm" onclick="openValidation('${i.id}')">Traiter</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function graviteColor(g) {
  return { leger:'#16a34a', moyen:'#ca8a04', grave:'#ea580c', critique:'#dc2626' }[g] || '#6b7280';
}

function viewIncident(id) {
  const list = getIncidents();
  const i = list.find(x => x.id === id);
  if (!i) return;
  const session = Auth.getSession();
  const isAdmin = session && session.role === 'admin';
  const typeLabel = INCIDENT_TYPES[i.type] || i.type;
  const gravLabel = GRAVITE_LABELS[i.gravite] || i.gravite;
  const statLabel = STATUT_LABELS[i.statut] || i.statut;
  const canValidate = isAdmin && (i.statut === 'declare' || i.statut === 'cours');

  document.getElementById('detailTitle').textContent = i.titre;

  document.getElementById('detailBody').innerHTML = `
    <div style="display:flex;gap:.5rem;flex-wrap:wrap">
      <span class="badge-incident ${GRAVITE_CLASSES[i.gravite]||''}">${gravLabel}</span>
      <span class="badge-status ${STATUT_CLASSES[i.statut]||''}">${statLabel}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;background:var(--bg-alt,#f9fafb);padding:.75rem;border-radius:var(--r)">
      <div><strong>Type</strong><br>${typeLabel}</div>
      <div><strong>Gravité</strong><br>${gravLabel}</div>
      <div><strong>Date</strong><br>${i.date ? formatDate(i.date) : '—'}</div>
      <div><strong>Heure</strong><br>${i.heure ? i.heure.slice(0,5) : '—'}</div>
      ${i.residentName ? `<div><strong>Résident</strong><br>${escHtml(i.residentName)}</div>` : ''}
      ${i.lieu ? `<div><strong>Lieu</strong><br>${escHtml(i.lieu)}</div>` : ''}
      <div><strong>Déclaré par</strong><br>${escHtml(i.declaredBy)}</div>
      <div><strong>Déclaré le</strong><br>${i.declaredAt ? formatDateTime(i.declaredAt) : '—'}</div>
    </div>
    <div><strong>Description</strong><br>${escHtml(i.description) || '—'}</div>
    ${i.validatedBy ? `<div><strong>Validé par</strong><br>${escHtml(i.validatedBy)}${i.validatedAt ? ' le '+formatDateTime(i.validatedAt) : ''}</div>` : ''}
    ${i.notes ? `<div><strong>Notes de validation</strong><br>${escHtml(i.notes)}</div>` : ''}
  `;

  const footer = document.getElementById('detailFooter');
  if (canValidate) {
    footer.innerHTML = `
      <button class="btn btn-ghost" onclick="closeModal('modalDetail')">Fermer</button>
      <button class="btn btn-outline" onclick="closeModal('modalDetail');openValidation('${i.id}')">Traiter</button>
    `;
  } else {
    footer.innerHTML = `<button class="btn btn-ghost" onclick="closeModal('modalDetail')">Fermer</button>`;
  }

  openModal('modalDetail');
}

function openValidation(id) {
  closeModal('modalDetail');
  const list = getIncidents();
  const i = list.find(x => x.id === id);
  if (!i) return;

  const body = document.getElementById('detailBody');
  const footer = document.getElementById('detailFooter');
  document.getElementById('detailTitle').textContent = `Traiter : ${i.titre}`;

  body.innerHTML = `
    <p style="font-size:.875rem;color:var(--muted)">Changer le statut de cet incident :</p>
    <div class="form-group">
      <label>Nouveau statut</label>
      <select id="vStatut">
        <option value="cours" ${i.statut === 'cours' ? 'selected' : ''}>En cours</option>
        <option value="valide" ${i.statut === 'valide' ? 'selected' : ''}>Validé</option>
        <option value="classe" ${i.statut === 'classe' ? 'selected' : ''}>Classé</option>
      </select>
    </div>
    <div class="form-group">
      <label>Notes (optionnel)</label>
      <textarea id="vNotes" rows="3" placeholder="Commentaire sur le traitement…">${escHtml(i.notes||'')}</textarea>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn btn-ghost" onclick="viewIncident('${id}')">Annuler</button>
    <button class="btn btn-primary" onclick="validateIncident('${id}')">Enregistrer</button>
  `;

  openModal('modalDetail');
}

function validateIncident(id) {
  const list = getIncidents();
  const i = list.find(x => x.id === id);
  if (!i) return;
  const session = Auth.getSession();
  const statut = document.getElementById('vStatut').value;
  const notes = document.getElementById('vNotes').value.trim();

  i.statut = statut;
  i.notes = notes || '';
  i.validatedBy = session ? `${session.prenom||''} ${session.nom||''}`.trim() || session.username : 'Inconnu';
  i.validatedById = session ? session.userId : null;
  i.validatedAt = new Date().toISOString();

  saveIncidents(list);
  closeModal('modalDetail');
  toast(`Incident ${STATUT_LABELS[statut]?.toLowerCase() || statut}`);
  renderIncidents();
}

function escHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  initIncidents();
  ['searchIncident','filterType','filterGravite','filterStatut'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderIncidents);
  });
});

// Re-render when modal closes
const _origCloseInc = closeModal;
closeModal = function(id) {
  _origCloseInc(id);
  if (id === 'modalIncident') renderIncidents();
};
