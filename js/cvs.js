// ── CONSEIL DE LA VIE SOCIALE (CVS) ──
let cvsTab = 'membres';
let cvsEditMembreId = null;
let cvsEditSeanceId = null;
let cvsResolutionsSeanceId = null;
let cvsCanEdit = false;

const CVS_COLLEGES = {
  residents: { label: 'Résidents', icon: '🧑', color: '#16a34a' },
  familles: { label: 'Familles / représentants légaux', icon: '👪', color: '#0369a1' },
  personnel: { label: 'Personnel', icon: '🧑‍⚕️', color: '#8b5cf6' },
  direction: { label: 'Direction / organisme gestionnaire', icon: '🏛️', color: '#dc2626' },
  exterieur: { label: 'Personnes qualifiées / partenaires', icon: '🤝', color: '#64748b' }
};
const CVS_ROLES = { titulaire: 'Titulaire', suppleant: 'Suppléant' };
const CVS_RESOLUTION_STATUTS = {
  a_faire: { label: 'À faire', color: '#dc2626' },
  en_cours: { label: 'En cours', color: '#d97706' },
  fait: { label: 'Réalisé', color: '#16a34a' }
};

function getCvs() { return DB.get(DB.keys.cvs) || { membres: [], seances: [] }; }
function saveCvs(data) { DB.set(DB.keys.cvs, data); }

function cvsMembres() {
  const data = getCvs();
  return [...(data.membres || [])].sort((a, b) =>
    (a.statut === 'ancien' ? 1 : 0) - (b.statut === 'ancien' ? 1 : 0) ||
    Object.keys(CVS_COLLEGES).indexOf(a.college) - Object.keys(CVS_COLLEGES).indexOf(b.college) ||
    (a.nom || '').localeCompare(b.nom || '', 'fr'));
}

function cvsSeances() {
  const data = getCvs();
  return [...(data.seances || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function cvsAllResolutions() {
  const out = [];
  cvsSeances().forEach(s => (s.resolutions || []).forEach(r => out.push({ ...r, seanceId: s.id, seanceDate: s.date })));
  return out;
}

function cvsProchaineSeance() {
  const td = today();
  return [...cvsSeances()].filter(s => s.date >= td).sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];
}

// ── RENDU PRINCIPAL ──
function renderCvs() {
  const membresActifs = cvsMembres().filter(m => m.statut !== 'ancien');
  const prochaine = cvsProchaineSeance();
  const resolutions = cvsAllResolutions();
  const enCours = resolutions.filter(r => r.statut !== 'fait');
  const ans = today().slice(0, 4);
  const seancesAnnee = cvsSeances().filter(s => (s.date || '').slice(0, 4) === ans);

  document.getElementById('cvsStats').innerHTML = `
    <div class="stat-card" style="border-left:3px solid #16a34a"><div class="stat-card-top"><span class="stat-label">Membres actifs</span></div><div class="stat-num">${membresActifs.length}</div></div>
    <div class="stat-card" style="border-left:3px solid #0369a1"><div class="stat-card-top"><span class="stat-label">Prochaine séance</span></div><div class="stat-num" style="font-size:1.1rem">${prochaine ? formatDate(prochaine.date) : '—'}</div></div>
    <div class="stat-card" style="border-left:3px solid ${enCours.length ? '#d97706' : '#16a34a'}"><div class="stat-card-top"><span class="stat-label">Résolutions en cours</span></div><div class="stat-num">${enCours.length}</div></div>
    <div class="stat-card" style="border-left:3px solid #6b7280"><div class="stat-card-top"><span class="stat-label">Séances (${ans})</span></div><div class="stat-num">${seancesAnnee.length}</div></div>`;

  renderCvsMembres();
  renderCvsSeances();
  renderCvsResolutions();
}

// ── ONGLETS ──
function cvsSwitchTab(name) {
  cvsTab = name;
  document.querySelectorAll('#cvsTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  ['membres', 'seances', 'resolutions'].forEach(n => {
    const el = document.getElementById('tab-cvs-' + n);
    if (el) el.style.display = n === name ? '' : 'none';
  });
}

// ── MEMBRES ──
function renderCvsMembres() {
  const list = cvsMembres();
  const el = document.getElementById('cvsMembresList');
  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:2.5rem"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><h3>Aucun membre</h3><p>Composez le CVS : résidents, familles, personnel et direction.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="grid grid-3" style="gap:.85rem">${list.map(cvsMembreCard).join('')}</div>`;
}

function cvsMembreCard(m) {
  const c = CVS_COLLEGES[m.college] || CVS_COLLEGES.exterieur;
  const ancien = m.statut === 'ancien';
  return `<div class="card" style="border-left:3px solid ${c.color};${ancien ? 'opacity:.55' : ''}">
    <div class="card-body" style="display:flex;flex-direction:column;gap:.45rem">
      <div style="display:flex;align-items:flex-start;gap:.5rem">
        <span style="font-size:1.3rem">${c.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:.9rem">${escHtml(m.nom || '')}</div>
          <div style="font-size:.72rem;color:var(--muted)">${c.label}${ancien ? ' · <span style="color:var(--red)">ancien membre</span>' : ''}</div>
        </div>
        ${m.role ? `<span class="badge badge-gray">${CVS_ROLES[m.role] || m.role}</span>` : ''}
      </div>
      <div style="font-size:.78rem;color:var(--text);display:flex;flex-direction:column;gap:.15rem">
        ${(m.mandatDebut || m.mandatFin) ? `<div>🗳️ Mandat ${m.mandatDebut ? formatDate(m.mandatDebut) : '—'} → ${m.mandatFin ? formatDate(m.mandatFin) : 'en cours'}</div>` : ''}
        ${m.contact ? `<div>✉️ ${escHtml(m.contact)}</div>` : ''}
      </div>
      ${cvsCanEdit ? `<div class="no-print" style="display:flex;gap:.3rem;justify-content:flex-end;border-top:1px solid var(--border);padding-top:.4rem">
        <button class="btn btn-ghost btn-sm" onclick="toggleMembreStatut('${m.id}')">${ancien ? '▶ Réactiver' : '⏸ Marquer ancien'}</button>
        <button class="btn btn-ghost btn-sm" onclick="openMembreModal('${m.id}')">✎</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteMembre('${m.id}')">✕</button>
      </div>` : ''}
    </div>
  </div>`;
}

function openMembreModal(id) {
  cvsEditMembreId = id || null;
  const m = id ? (getCvs().membres || []).find(x => x.id === id) || {} : {};
  document.getElementById('cmTitle').textContent = id ? 'Modifier le membre' : 'Nouveau membre';
  document.getElementById('cmNom').value = m.nom || '';
  document.getElementById('cmCollege').value = m.college || 'residents';
  document.getElementById('cmRole').value = m.role || 'titulaire';
  document.getElementById('cmContact').value = m.contact || '';
  document.getElementById('cmMandatDebut').value = m.mandatDebut || '';
  document.getElementById('cmMandatFin').value = m.mandatFin || '';
  openModal('modalCvsMembre');
}

function saveMembre() {
  const nom = document.getElementById('cmNom').value.trim();
  if (!nom) { toast('Le nom est requis', 'error'); return; }
  const data = {
    nom,
    college: document.getElementById('cmCollege').value,
    role: document.getElementById('cmRole').value,
    contact: document.getElementById('cmContact').value.trim(),
    mandatDebut: document.getElementById('cmMandatDebut').value,
    mandatFin: document.getElementById('cmMandatFin').value
  };
  const cvs = getCvs();
  let membres = cvs.membres || [];
  if (cvsEditMembreId) {
    membres = membres.map(x => x.id === cvsEditMembreId ? { ...x, ...data } : x);
    toast('Membre mis à jour');
  } else {
    membres = [...membres, { id: genId(), ...data, statut: 'actif', createdAt: new Date().toISOString() }];
    toast('Membre ajouté ✓');
  }
  saveCvs({ ...cvs, membres });
  if (typeof auditLog === 'function') auditLog('cvs_membre_save', `Membre CVS — ${nom}`);
  closeModal('modalCvsMembre');
  renderCvs();
}

function toggleMembreStatut(id) {
  const cvs = getCvs();
  const membres = (cvs.membres || []).map(x => x.id === id ? { ...x, statut: x.statut === 'ancien' ? 'actif' : 'ancien' } : x);
  saveCvs({ ...cvs, membres });
  renderCvs();
}

function deleteMembre(id) {
  confirmDialog('Supprimer ce membre du CVS ?', () => {
    const cvs = getCvs();
    saveCvs({ ...cvs, membres: (cvs.membres || []).filter(x => x.id !== id) });
    renderCvs();
    toast('Membre supprimé', 'info');
  });
}

// ── SÉANCES ──
function renderCvsSeances() {
  const list = cvsSeances();
  const el = document.getElementById('cvsSeancesList');
  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:2.5rem"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><h3>Aucune séance</h3><p>Enregistrez les séances du Conseil de la Vie Sociale et leurs comptes-rendus.</p></div>`;
    return;
  }
  el.innerHTML = list.map(cvsSeanceCard).join('');
}

function cvsSeanceCard(s) {
  const resolutions = s.resolutions || [];
  const ouvertes = resolutions.filter(r => r.statut !== 'fait').length;
  const futur = s.date >= today();
  return `<div class="card" style="border-left:3px solid ${futur ? '#0369a1' : '#6b7280'};margin-bottom:.85rem">
    <div class="card-body" style="display:flex;flex-direction:column;gap:.5rem">
      <div style="display:flex;align-items:flex-start;gap:.6rem;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="font-weight:700;font-size:.9rem">📅 ${formatDate(s.date)}${s.heure ? ' · ' + s.heure.slice(0,5) : ''}${futur ? ' <span class="badge badge-blue">à venir</span>' : ''}</div>
          ${s.lieu ? `<div style="font-size:.75rem;color:var(--muted)">📍 ${escHtml(s.lieu)}</div>` : ''}
        </div>
        ${resolutions.length ? `<span class="badge" style="background:${ouvertes ? '#fef3c7' : '#f0fdf4'};color:${ouvertes ? '#d97706' : '#16a34a'}">${resolutions.length - ouvertes} / ${resolutions.length} résolution(s) réalisée(s)</span>` : ''}
      </div>
      ${s.ordreDuJour ? `<div style="font-size:.78rem;color:var(--text)"><strong>Ordre du jour :</strong> ${escHtml(s.ordreDuJour)}</div>` : ''}
      ${s.compteRendu ? `<div style="font-size:.78rem;color:var(--muted)">${escHtml(s.compteRendu).slice(0, 220)}${s.compteRendu.length > 220 ? '…' : ''}</div>` : ''}
      <div class="no-print" style="display:flex;gap:.3rem;justify-content:flex-end;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:.4rem">
        <button class="btn btn-ghost btn-sm" onclick="openResolutionsModal('${s.id}')">📋 Résolutions</button>
        <button class="btn btn-ghost btn-sm" onclick="printCR('${s.id}')">🖨 Compte-rendu</button>
        ${cvsCanEdit ? `<button class="btn btn-ghost btn-sm" onclick="openSeanceModal('${s.id}')">✎</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteSeance('${s.id}')">✕</button>` : ''}
      </div>
    </div>
  </div>`;
}

function openSeanceModal(id) {
  cvsEditSeanceId = id || null;
  const s = id ? (getCvs().seances || []).find(x => x.id === id) || {} : {};
  document.getElementById('csTitle').textContent = id ? 'Modifier la séance' : 'Nouvelle séance';
  document.getElementById('csDate').value = s.date || today();
  document.getElementById('csHeure').value = s.heure || '';
  document.getElementById('csLieu').value = s.lieu || '';
  document.getElementById('csOrdreDuJour').value = s.ordreDuJour || '';
  document.getElementById('csPresents').value = s.presents || '';
  document.getElementById('csExcuses').value = s.excuses || '';
  document.getElementById('csCompteRendu').value = s.compteRendu || '';
  openModal('modalCvsSeance');
}

function saveSeance() {
  const date = document.getElementById('csDate').value;
  if (!date) { toast('La date est requise', 'error'); return; }
  const data = {
    date,
    heure: document.getElementById('csHeure').value,
    lieu: document.getElementById('csLieu').value.trim(),
    ordreDuJour: document.getElementById('csOrdreDuJour').value.trim(),
    presents: document.getElementById('csPresents').value.trim(),
    excuses: document.getElementById('csExcuses').value.trim(),
    compteRendu: document.getElementById('csCompteRendu').value.trim()
  };
  const cvs = getCvs();
  let seances = cvs.seances || [];
  if (cvsEditSeanceId) {
    seances = seances.map(x => x.id === cvsEditSeanceId ? { ...x, ...data } : x);
    toast('Séance mise à jour');
  } else {
    seances = [...seances, { id: genId(), ...data, resolutions: [], createdAt: new Date().toISOString() }];
    toast('Séance enregistrée ✓');
  }
  saveCvs({ ...cvs, seances });
  if (typeof auditLog === 'function') auditLog('cvs_seance_save', `Séance CVS — ${formatDate(date)}`);
  closeModal('modalCvsSeance');
  renderCvs();
}

function deleteSeance(id) {
  confirmDialog('Supprimer cette séance et son compte-rendu ?', () => {
    const cvs = getCvs();
    saveCvs({ ...cvs, seances: (cvs.seances || []).filter(x => x.id !== id) });
    renderCvs();
    toast('Séance supprimée', 'info');
  });
}

// ── RÉSOLUTIONS (par séance) ──
function openResolutionsModal(seanceId) {
  cvsResolutionsSeanceId = seanceId;
  const s = (getCvs().seances || []).find(x => x.id === seanceId);
  if (!s) return;
  document.getElementById('rmTitle').textContent = `Résolutions — séance du ${formatDate(s.date)}`;
  document.getElementById('rmTexte').value = '';
  document.getElementById('rmResponsable').value = '';
  document.getElementById('rmEcheance').value = '';
  const addBox = document.getElementById('rmAddBox');
  if (addBox) addBox.style.display = cvsCanEdit ? '' : 'none';
  renderResolutionsList(s);
  openModal('modalCvsResolutions');
}

function renderResolutionsList(s) {
  const box = document.getElementById('rmList');
  const resolutions = s.resolutions || [];
  if (!resolutions.length) { box.innerHTML = '<div style="font-size:.8rem;color:var(--g400);padding:.5rem 0">Aucune résolution pour cette séance.</div>'; return; }
  box.innerHTML = resolutions.map(r => {
    const st = CVS_RESOLUTION_STATUTS[r.statut] || CVS_RESOLUTION_STATUTS.a_faire;
    return `<div style="display:flex;align-items:flex-start;gap:.6rem;padding:.55rem .75rem;background:var(--g50);border:1px solid var(--border);border-radius:var(--r-sm)">
      <div style="flex:1;min-width:0">
        <div style="font-size:.83rem;font-weight:600">${escHtml(r.texte || '')}</div>
        <div style="font-size:.7rem;color:var(--muted)">${r.responsable ? '👤 ' + escHtml(r.responsable) : ''}${r.echeance ? (r.responsable ? ' · ' : '') + '⏳ ' + formatDate(r.echeance) : ''}</div>
      </div>
      ${cvsCanEdit ? `<select class="badge-select" style="font-size:.72rem" onchange="setResolutionStatut('${s.id}','${r.id}',this.value)">
        ${Object.entries(CVS_RESOLUTION_STATUTS).map(([k, v]) => `<option value="${k}" ${r.statut === k ? 'selected' : ''}>${v.label}</option>`).join('')}
      </select>
      <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteResolution('${s.id}','${r.id}')">✕</button>` :
      `<span class="badge" style="background:${st.color}1a;color:${st.color}">${st.label}</span>`}
    </div>`;
  }).join('');
}

function addResolution(seanceId) {
  const texte = document.getElementById('rmTexte').value.trim();
  if (!texte) { toast('Le texte de la résolution est requis', 'error'); return; }
  const cvs = getCvs();
  const seances = (cvs.seances || []).map(x => {
    if (x.id !== seanceId) return x;
    const r = {
      id: genId(), texte,
      responsable: document.getElementById('rmResponsable').value.trim(),
      echeance: document.getElementById('rmEcheance').value,
      statut: 'a_faire'
    };
    return { ...x, resolutions: [...(x.resolutions || []), r] };
  });
  saveCvs({ ...cvs, seances });
  document.getElementById('rmTexte').value = '';
  document.getElementById('rmResponsable').value = '';
  document.getElementById('rmEcheance').value = '';
  renderResolutionsList(seances.find(x => x.id === seanceId));
  renderCvs();
}

function setResolutionStatut(seanceId, resId, statut) {
  const cvs = getCvs();
  const seances = (cvs.seances || []).map(x => x.id === seanceId
    ? { ...x, resolutions: (x.resolutions || []).map(r => r.id === resId ? { ...r, statut } : r) }
    : x);
  saveCvs({ ...cvs, seances });
  renderCvs();
}

function deleteResolution(seanceId, resId) {
  const cvs = getCvs();
  const seances = (cvs.seances || []).map(x => x.id === seanceId
    ? { ...x, resolutions: (x.resolutions || []).filter(r => r.id !== resId) }
    : x);
  saveCvs({ ...cvs, seances });
  renderResolutionsList(seances.find(x => x.id === seanceId));
  renderCvs();
}

// ── SUIVI DES RÉSOLUTIONS (toutes séances) ──
function renderCvsResolutions() {
  const all = cvsAllResolutions();
  const el = document.getElementById('cvsResolutionsList');
  if (!all.length) {
    el.innerHTML = `<div class="empty" style="padding:2.5rem"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div><h3>Aucune résolution</h3><p>Les résolutions adoptées en séance s'affichent ici, tous comptes-rendus confondus.</p></div>`;
    return;
  }
  const td = today();
  const groups = {
    a_faire: all.filter(r => r.statut === 'a_faire'),
    en_cours: all.filter(r => r.statut === 'en_cours'),
    fait: all.filter(r => r.statut === 'fait')
  };
  ['a_faire', 'en_cours'].forEach(k => groups[k].sort((a, b) => (a.echeance || '').localeCompare(b.echeance || '')));
  groups.fait.sort((a, b) => (b.seanceDate || '').localeCompare(a.seanceDate || ''));
  const row = r => {
    const st = CVS_RESOLUTION_STATUTS[r.statut] || CVS_RESOLUTION_STATUTS.a_faire;
    const retard = r.statut !== 'fait' && r.echeance && r.echeance < td;
    return `<div style="display:flex;align-items:flex-start;gap:.6rem;padding:.55rem .75rem;background:var(--g50);border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:.4rem">
      <div style="flex:1;min-width:0">
        <div style="font-size:.83rem;font-weight:600">${escHtml(r.texte || '')}</div>
        <div style="font-size:.7rem;color:var(--muted)">Séance du ${formatDate(r.seanceDate)}${r.responsable ? ' · 👤 ' + escHtml(r.responsable) : ''}${r.echeance ? ' · ⏳ ' + formatDate(r.echeance) : ''}${retard ? ' · <span style="color:#dc2626">en retard</span>' : ''}</div>
      </div>
      <span class="badge" style="background:${st.color}1a;color:${st.color}">${st.label}</span>
    </div>`;
  };
  const section = (title, arr, open) => arr.length ? `
    <details ${open ? 'open' : ''} style="margin-bottom:1rem">
      <summary class="section-label" style="cursor:pointer;list-style:none;margin-bottom:.6rem">${title} (${arr.length})</summary>
      ${arr.map(row).join('')}
    </details>` : '';
  el.innerHTML =
    section('À faire', groups.a_faire, true) +
    section('En cours', groups.en_cours, true) +
    section('Réalisées', groups.fait, false);
}

// ── IMPRESSION ──
function printCR(seanceId) {
  const s = (getCvs().seances || []).find(x => x.id === seanceId);
  if (!s) return;
  const settings = DB.get(DB.keys.settings) || {};
  const w = window.open('', '_blank');
  if (!w) { toast('Autorisez les fenêtres pop-up pour imprimer', 'error'); return; }
  const resolutions = s.resolutions || [];
  w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>CR CVS — ${formatDate(s.date)}</title>
    <style>
      body{font-family:'Inter','Segoe UI',sans-serif;max-width:780px;margin:1.5rem auto;padding:0 1.5rem;color:#1e293b;font-size:10pt;line-height:1.6}
      h1{font-size:15pt;color:#0f2b4a;border-bottom:2px solid #0f2b4a;padding-bottom:.3rem}
      h2{font-size:11pt;color:#0f2b4a;margin-top:1.4rem}
      .meta{color:#64748b;font-size:9pt;margin-bottom:1.2rem}
      .desc{white-space:pre-wrap;font-size:9.5pt;border:1px solid #e2e8f0;border-radius:6px;padding:.6rem .75rem;margin-top:.3rem}
      table{width:100%;border-collapse:collapse;margin-top:.4rem}
      th{text-align:left;font-size:8pt;text-transform:uppercase;letter-spacing:.04em;color:#0f2b4a;border-bottom:2px solid #0f2b4a;padding:.3rem .4rem}
      td{padding:.3rem .4rem;border-bottom:1px solid #e2e8f0;font-size:9pt;vertical-align:top}
      .sig{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:2.5rem}
      .sig div{border-top:1px solid #94a3b8;padding-top:.4rem;font-size:9pt;color:#475569}
      @page{margin:1.5cm}
    </style></head><body>
    <h1>Conseil de la Vie Sociale — Compte-rendu</h1>
    <div class="meta">${escHtml(settings.etablissement || 'Établissement')} · Séance du ${formatDate(s.date)}${s.heure ? ' à ' + s.heure.slice(0,5) : ''}${s.lieu ? ' · ' + escHtml(s.lieu) : ''}</div>
    <h2>Présents</h2>
    <div class="desc">${escHtml(s.presents || '—')}</div>
    <h2>Excusés</h2>
    <div class="desc">${escHtml(s.excuses || '—')}</div>
    <h2>Ordre du jour</h2>
    <div class="desc">${escHtml(s.ordreDuJour || '—')}</div>
    <h2>Compte-rendu des échanges</h2>
    <div class="desc">${escHtml(s.compteRendu || '—')}</div>
    ${resolutions.length ? `<h2>Résolutions adoptées</h2>
    <table><thead><tr><th>Résolution</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead>
    <tbody>${resolutions.map(r => `<tr><td>${escHtml(r.texte || '')}</td><td>${escHtml(r.responsable || '—')}</td><td>${r.echeance ? formatDate(r.echeance) : '—'}</td><td>${(CVS_RESOLUTION_STATUTS[r.statut] || CVS_RESOLUTION_STATUTS.a_faire).label}</td></tr>`).join('')}</tbody></table>` : ''}
    <div class="sig"><div>Le président de séance<br><br><br></div><div>Le secrétaire de séance<br><br><br></div></div>
    <script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}

// ── INIT ──
function initCvs() {
  const s = Auth.requireAuth();
  if (!s) return;
  if (!requireModule('access_cvs')) return;
  cvsCanEdit = ((typeof canEditResidents === 'function') ? canEditResidents(s.userId) : false) || Auth.isAdmin();
  document.getElementById('cmCollege').innerHTML = Object.entries(CVS_COLLEGES).map(([k, c]) => `<option value="${k}">${c.icon} ${c.label}</option>`).join('');
  document.getElementById('cmRole').innerHTML = Object.entries(CVS_ROLES).map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  if (!cvsCanEdit) {
    document.querySelectorAll('.no-cvs-edit').forEach(el => el.style.display = 'none');
  }
  document.querySelectorAll('#cvsTabs .tab').forEach(t => t.addEventListener('click', () => cvsSwitchTab(t.dataset.tab)));
  renderCvs();
}
document.addEventListener('DOMContentLoaded', initCvs);
