// ── ACTIVITÉS ÉDUCATIVES — catalogue, inscriptions, bilans ──
let actEditId = null;
let actParticipantsId = null;

const ACT_CATEGORIES = {
  sportive: { label: 'Sportive', icon: '⚽', color: '#16a34a' },
  creative: { label: 'Créative / Artistique', icon: '🎨', color: '#db2777' },
  culturelle: { label: 'Culturelle', icon: '🎭', color: '#8b5cf6' },
  scolaire: { label: 'Scolaire / Soutien', icon: '📚', color: '#0369a1' },
  autonomie: { label: 'Autonomie / Vie quotidienne', icon: '🧺', color: '#d97706' },
  sortie: { label: 'Sortie / Extérieur', icon: '🚌', color: '#0d9488' },
  citoyennete: { label: 'Citoyenneté / Expression', icon: '🗳️', color: '#6366f1' },
  autre: { label: 'Autre', icon: '✨', color: '#64748b' }
};
const ACT_JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche', 'Ponctuel'];
const ACT_JOUR_AUJOURDHUI = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][new Date().getDay()];

function getActivites() { return DB.get(DB.keys.activites) || []; }
function saveActivites(list) { DB.set(DB.keys.activites, list); }
function actResidents() {
  return (DB.get(DB.keys.residents) || []).filter(r => r.statut !== 'sorti')
    .sort((a, b) => `${a.nom || ''}`.localeCompare(`${b.nom || ''}`, 'fr'));
}

// Inscriptions actives pour une activité donnée, tous résidents confondus
function actInscriptions(activiteId) {
  const out = [];
  actResidents().forEach(r => {
    (r.activites || []).filter(i => String(i.activiteId) === String(activiteId) && i.statut === 'active')
      .forEach(i => out.push({ resident: r, inscription: i }));
  });
  return out;
}

function actBilansCeMois() {
  const ym = today().slice(0, 7);
  let n = 0;
  actResidents().forEach(r => (r.activites || []).forEach(i => (i.bilans || []).forEach(b => { if ((b.date || '').slice(0, 7) === ym) n++; })));
  return n;
}

// ── RENDU PRINCIPAL ──
function renderActivites() {
  const all = getActivites();
  const fCat = document.getElementById('aFilterCat')?.value || '';
  const fJour = document.getElementById('aFilterJour')?.value || '';
  let list = all;
  if (fCat) list = list.filter(a => a.categorie === fCat);
  if (fJour) list = list.filter(a => a.jour === fJour);
  list = [...list].sort((a, b) => (b.actif ? 1 : 0) - (a.actif ? 1 : 0) || (a.nom || '').localeCompare(b.nom || '', 'fr'));

  const actives = all.filter(a => a.actif !== false);
  const totalInscrits = actResidents().reduce((n, r) => n + (r.activites || []).filter(i => i.statut === 'active').length, 0);
  const aujourdhui = actives.filter(a => a.jour === ACT_JOUR_AUJOURDHUI);
  document.getElementById('aStats').innerHTML = `
    <div class="stat-card" style="border-left:3px solid #6366f1"><div class="stat-card-top"><span class="stat-label">Activités actives</span></div><div class="stat-num">${actives.length}</div></div>
    <div class="stat-card" style="border-left:3px solid #16a34a"><div class="stat-card-top"><span class="stat-label">Aujourd'hui (${ACT_JOUR_AUJOURDHUI})</span></div><div class="stat-num">${aujourdhui.length}</div></div>
    <div class="stat-card" style="border-left:3px solid #0d9488"><div class="stat-card-top"><span class="stat-label">Inscriptions actives</span></div><div class="stat-num">${totalInscrits}</div></div>
    <div class="stat-card" style="border-left:3px solid #d97706"><div class="stat-card-top"><span class="stat-label">Bilans ce mois</span></div><div class="stat-num">${actBilansCeMois()}</div></div>`;

  const el = document.getElementById('aGrid');
  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:2.5rem"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div><h3>Aucune activité</h3><p>Créez le catalogue des activités éducatives proposées aux résidents.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="grid grid-3" style="gap:.85rem">${list.map(activiteCard).join('')}</div>`;
}

function activiteCard(a) {
  const c = ACT_CATEGORIES[a.categorie] || ACT_CATEGORIES.autre;
  const inscrits = actInscriptions(a.id).length;
  const canEdit = (typeof canEditResidents === 'function') ? canEditResidents(Auth.getSession()?.userId) : Auth.isAdmin();
  const plein = a.placesMax > 0 && inscrits >= a.placesMax;
  return `<div class="card" style="border-left:3px solid ${c.color};${a.actif === false ? 'opacity:.55' : ''}">
    <div class="card-body" style="display:flex;flex-direction:column;gap:.5rem">
      <div style="display:flex;align-items:flex-start;gap:.5rem">
        <span style="font-size:1.3rem">${c.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:.9rem">${escHtml(a.nom || 'Activité')}</div>
          <div style="font-size:.72rem;color:var(--muted)">${c.label}${a.actif === false ? ' · <span style="color:var(--red)">inactive</span>' : ''}</div>
        </div>
      </div>
      <div style="font-size:.78rem;color:var(--text);display:flex;flex-direction:column;gap:.15rem">
        ${a.jour ? `<div>📅 ${escHtml(a.jour)}${a.heureDebut ? ' · ' + a.heureDebut + (a.heureFin ? '–' + a.heureFin : '') : ''}</div>` : ''}
        ${a.lieu ? `<div>📍 ${escHtml(a.lieu)}</div>` : ''}
        ${a.animateur ? `<div>👤 ${escHtml(a.animateur)}</div>` : ''}
      </div>
      ${a.description ? `<div style="font-size:.74rem;color:var(--muted)">${escHtml(a.description)}</div>` : ''}
      <div style="display:flex;align-items:center;gap:.4rem;margin-top:.2rem">
        <span class="badge" style="background:${plein ? '#fee2e2' : c.color + '1a'};color:${plein ? '#dc2626' : c.color}">${inscrits}${a.placesMax > 0 ? ' / ' + a.placesMax : ''} inscrit${inscrits > 1 ? 's' : ''}${plein ? ' · complet' : ''}</span>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="openParticipantsModal('${a.id}')">👥 Participants</button>
      </div>
      ${canEdit ? `<div class="no-print" style="display:flex;gap:.3rem;justify-content:flex-end;border-top:1px solid var(--border);padding-top:.4rem">
        <button class="btn btn-ghost btn-sm" onclick="toggleActiviteActif('${a.id}')">${a.actif === false ? '▶ Réactiver' : '⏸ Suspendre'}</button>
        <button class="btn btn-ghost btn-sm" onclick="openActiviteModal('${a.id}')">✎</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteActivite('${a.id}')">✕</button>
      </div>` : ''}
    </div>
  </div>`;
}

// ── CRUD CATALOGUE ──
function openActiviteModal(id) {
  actEditId = id || null;
  const a = id ? getActivites().find(x => x.id === id) || {} : {};
  document.getElementById('amTitle').textContent = id ? "Modifier l'activité" : 'Nouvelle activité';
  document.getElementById('amNom').value = a.nom || '';
  document.getElementById('amCategorie').value = a.categorie || 'sportive';
  document.getElementById('amJour').value = a.jour || 'Ponctuel';
  document.getElementById('amHeureDebut').value = a.heureDebut || '';
  document.getElementById('amHeureFin').value = a.heureFin || '';
  document.getElementById('amLieu').value = a.lieu || '';
  document.getElementById('amAnimateur').value = a.animateur || '';
  document.getElementById('amPlacesMax').value = a.placesMax || '';
  document.getElementById('amDescription').value = a.description || '';
  openModal('modalActivite');
}

function saveActivite() {
  const nom = document.getElementById('amNom').value.trim();
  if (!nom) { toast('Le nom est requis', 'error'); return; }
  const data = {
    nom,
    categorie: document.getElementById('amCategorie').value,
    jour: document.getElementById('amJour').value,
    heureDebut: document.getElementById('amHeureDebut').value,
    heureFin: document.getElementById('amHeureFin').value,
    lieu: document.getElementById('amLieu').value.trim(),
    animateur: document.getElementById('amAnimateur').value.trim(),
    placesMax: parseInt(document.getElementById('amPlacesMax').value, 10) || 0,
    description: document.getElementById('amDescription').value.trim()
  };
  let list = getActivites();
  if (actEditId) {
    list = list.map(x => x.id === actEditId ? { ...x, ...data } : x);
    toast('Activité mise à jour');
  } else {
    list.push({ id: genId(), ...data, actif: true, createdAt: new Date().toISOString() });
    toast('Activité créée ✓');
  }
  saveActivites(list);
  if (typeof auditLog === 'function') auditLog('activite_save', `Activité — ${nom}`);
  closeModal('modalActivite');
  renderActivites();
}

function toggleActiviteActif(id) {
  saveActivites(getActivites().map(x => x.id === id ? { ...x, actif: x.actif === false } : x));
  renderActivites();
}

function deleteActivite(id) {
  confirmDialog('Supprimer cette activité du catalogue ? Les inscriptions existantes seront conservées sur les fiches résidents.', () => {
    saveActivites(getActivites().filter(x => x.id !== id));
    renderActivites();
    toast('Activité supprimée', 'info');
  });
}

// ── PARTICIPANTS & INSCRIPTIONS ──
function openParticipantsModal(id) {
  actParticipantsId = id;
  const a = getActivites().find(x => x.id === id);
  if (!a) return;
  const c = ACT_CATEGORIES[a.categorie] || ACT_CATEGORIES.autre;
  document.getElementById('pmTitle').textContent = `${c.icon} ${a.nom}`;
  const inscrits = actInscriptions(id);
  const inscritIds = new Set(inscrits.map(x => String(x.resident.id)));
  const opts = actResidents().filter(r => !inscritIds.has(String(r.id)))
    .map(r => `<option value="${r.id}">${escHtml(`${r.prenom || ''} ${r.nom || ''}`.trim())}</option>`).join('');
  document.getElementById('pmAddResident').innerHTML = '<option value="">— Inscrire un résident —</option>' + opts;
  renderParticipantsList(inscrits);
  openModal('modalParticipants');
}

function renderParticipantsList(inscrits) {
  const box = document.getElementById('pmList');
  if (!inscrits.length) { box.innerHTML = '<div style="font-size:.8rem;color:var(--g400);padding:.5rem 0">Aucun résident inscrit pour le moment.</div>'; return; }
  box.innerHTML = inscrits.map(({ resident: r, inscription: i }) => {
    const lastBilan = (i.bilans || []).slice().sort((x, y) => (y.date || '').localeCompare(x.date || ''))[0];
    return `<div style="display:flex;align-items:flex-start;gap:.6rem;padding:.55rem .75rem;background:var(--g50);border:1px solid var(--border);border-radius:var(--r-sm)">
      <div style="flex:1;min-width:0">
        <a href="resident.html?id=${r.id}" style="font-weight:650;font-size:.83rem;color:var(--text);text-decoration:none">${escHtml(`${r.prenom || ''} ${r.nom || ''}`.trim())}</a>
        <div style="font-size:.7rem;color:var(--muted)">Inscrit le ${formatDate(i.dateInscription)}</div>
        ${lastBilan ? `<div style="font-size:.72rem;color:var(--muted);margin-top:2px">📝 ${formatDate(lastBilan.date)} — ${escHtml((lastBilan.texte || '').slice(0, 100))}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm" style="color:var(--red)" title="Mettre fin à l'inscription" onclick="desinscrireResident('${r.id}','${i.id}')">↩</button>
    </div>`;
  }).join('');
}

function inscrireResident() {
  const rid = document.getElementById('pmAddResident').value;
  if (!rid) { toast('Choisissez un résident', 'error'); return; }
  const residents = DB.get(DB.keys.residents) || [];
  const r = residents.find(x => String(x.id) === String(rid));
  if (!r) return;
  const inscription = { id: genId(), activiteId: actParticipantsId, dateInscription: today(), statut: 'active', bilans: [] };
  r.activites = [...(r.activites || []), inscription];
  DB.set(DB.keys.residents, residents.map(x => String(x.id) === String(rid) ? r : x));
  if (typeof auditLog === 'function') auditLog('activite_inscription', `Inscription — ${(r.prenom || '') + ' ' + (r.nom || '')} → ${(getActivites().find(a => a.id === actParticipantsId) || {}).nom || ''}`);
  toast('Résident inscrit ✓');
  openParticipantsModal(actParticipantsId);
  renderActivites();
}

function desinscrireResident(residentId, inscriptionId) {
  confirmDialog("Mettre fin à l'inscription de ce résident à l'activité ?", () => {
    const residents = DB.get(DB.keys.residents) || [];
    const r = residents.find(x => String(x.id) === String(residentId));
    if (!r) return;
    r.activites = (r.activites || []).map(i => i.id === inscriptionId ? { ...i, statut: 'terminee', dateFin: today() } : i);
    DB.set(DB.keys.residents, residents.map(x => String(x.id) === String(residentId) ? r : x));
    toast('Inscription terminée', 'info');
    openParticipantsModal(actParticipantsId);
    renderActivites();
  });
}

// ── INIT ──
function initActivites() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('access_activites')) return;
  document.getElementById('aFilterCat').innerHTML = '<option value="">Toutes catégories</option>' + Object.entries(ACT_CATEGORIES).map(([k, c]) => `<option value="${k}">${c.icon} ${c.label}</option>`).join('');
  document.getElementById('aFilterJour').innerHTML = '<option value="">Tous les jours</option>' + ACT_JOURS.map(j => `<option value="${j}">${j}</option>`).join('');
  document.getElementById('amCategorie').innerHTML = Object.entries(ACT_CATEGORIES).map(([k, c]) => `<option value="${k}">${c.icon} ${c.label}</option>`).join('');
  document.getElementById('amJour').innerHTML = ACT_JOURS.map(j => `<option value="${j}">${j}</option>`).join('');
  const canEdit = (typeof canEditResidents === 'function') ? canEditResidents(s.userId) : Auth.isAdmin();
  if (!canEdit) { const b = document.getElementById('btnAddActivite'); if (b) b.style.display = 'none'; }
  ['aFilterCat', 'aFilterJour'].forEach(id => document.getElementById(id)?.addEventListener('change', renderActivites));
  renderActivites();
}
document.addEventListener('DOMContentLoaded', initActivites);
