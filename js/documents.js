const DOCUMENTS_KEY = DB.keys.documents;

function docTypeIcon(mime) {
  if (!mime) return '📎';
  if (mime.includes('pdf')) return '📄';
  if (mime.includes('image')) return '🖼️';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  return '📎';
}
function fmtSize(b) {
  if (b < 1024) return b + ' o';
  if (b < 1024*1024) return Math.round(b/1024) + ' Ko';
  return (b/1024/1024).toFixed(1) + ' Mo';
}

function getAllDocuments() {
  const residents = sbResidents();
  return docResAll().map(d => {
    if (String(d.residentId) === '_resources') return { ...d, residentName: '📁 Ressource', type: 'resource' };
    const r = residents.find(x => String(x.id) === String(d.residentId));
    return { ...d, residentName: r ? `${r.prenom||''} ${r.nom||''}` : 'Inconnu', type: d.type || 'resident' };
  }).sort((a, b) => (b.docDate || b.date || '').localeCompare(a.docDate || a.date || ''));
}

function initDocuments() {
  const session = Auth.requireAuth();
  if (!session) return;
  if (!requireModule('access_documents')) return;
  populateDocResidentSelect();
  renderDocuments();
}

function populateDocResidentSelect() {
  const sel = document.getElementById('docFilterResident');
  if (!sel) return;
  const residents = sbResidents();
  sel.innerHTML = '<option value="">Tous les résidents</option>' + residents.map(r =>
    `<option value="${r.id}">${escHtml(r.prenom||'')} ${escHtml(r.nom||'')}</option>`
  ).join('');
}

// ── Enrichissement de la liste (design 1) : pastille catégorie, avatar résident, statut d'échéance ──
const DOC_CAT_STYLE = {
  administratif: ['#E6F1FB', '#0C447C'], rapport: ['#E6F1FB', '#0C447C'],
  medical: ['#E1F5EE', '#0F6E56'], 'médical': ['#E1F5EE', '#0F6E56'], attestation: ['#E1F5EE', '#0F6E56'], cmu: ['#E1F5EE', '#0F6E56'],
  scolaire: ['#EAF3DE', '#27500A'], 'scolarité': ['#EAF3DE', '#27500A'],
  judiciaire: ['#FAEEDA', '#633806'], jugement: ['#FAEEDA', '#633806'],
  contrat: ['#EEEDFE', '#3C3489'], avenant: ['#EEEDFE', '#3C3489'],
  identite: ['#F1EFE8', '#2C2C2A'], "pièce d'identité": ['#F1EFE8', '#2C2C2A'], autre: ['#F1EFE8', '#2C2C2A']
};
function docCatPill(cat, label) {
  const s = DOC_CAT_STYLE[(cat || 'autre').toLowerCase().trim()] || ['#F1EFE8', '#2C2C2A'];
  return `<span style="display:inline-block;font-size:.72rem;font-weight:600;padding:2px 9px;border-radius:999px;background:${s[0]};color:${s[1]};white-space:nowrap">${escHtml(label || cat || '—')}</span>`;
}
function docAvatarCell(name) {
  const n = (name || '').trim();
  const ini = n ? n.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : '?';
  return `<span style="display:inline-flex;align-items:center;gap:.45rem;min-width:0"><span style="width:24px;height:24px;border-radius:50%;background:#e2e8f0;color:#64748b;display:inline-flex;align-items:center;justify-content:center;font-size:.66rem;font-weight:700;flex-shrink:0">${escHtml(ini)}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(n || '—')}</span></span>`;
}
function docEcheanceChip(d) {
  if (!d.dueDate) return '<span style="color:var(--muted)">—</span>';
  if (d.done) return `<span style="display:inline-block;font-size:.72rem;font-weight:600;padding:2px 9px;border-radius:999px;background:#F1EFE8;color:#5F5E5A;white-space:nowrap">Traité</span>`;
  const days = Math.round((new Date(d.dueDate) - new Date(today())) / 86400000);
  let bg, fg, txt;
  if (days < 0) { bg = '#FCEBEB'; fg = '#A32D2D'; txt = 'En retard'; }
  else if (days === 0) { bg = '#FAEEDA'; fg = '#854F0B'; txt = "Aujourd'hui"; }
  else if (days <= 30) { bg = '#FAEEDA'; fg = '#854F0B'; txt = 'Dans ' + days + ' j'; }
  else { bg = '#EAF3DE'; fg = '#27500A'; txt = 'Dans ' + days + ' j'; }
  return `<span style="display:inline-block;font-size:.72rem;font-weight:600;padding:2px 9px;border-radius:999px;background:${bg};color:${fg};white-space:nowrap">${txt}</span>`;
}
function renderDocuments() {
  const container = document.getElementById('documentList');
  if (!container) return;
  const list = getAllDocuments();
  const search = (document.getElementById('docSearchInput')?.value || '').toLowerCase();
  const filterRes = document.getElementById('docFilterResident')?.value || '';
  const filterCat = document.getElementById('docFilterCategory')?.value || '';
  const filterType = document.getElementById('docFilterType')?.value || '';
  renderFamilleLiensPanel(filterRes);

  let filtered = list;
  if (filterRes) filtered = filtered.filter(d => d.residentId === filterRes);
  if (filterType) filtered = filtered.filter(d => (d.type || 'resident') === filterType);
  if (filterCat) filtered = filtered.filter(d => d.category === filterCat);
  if (search) filtered = filtered.filter(d =>
    (d.residentName||'').toLowerCase().includes(search) ||
    (d.name||'').toLowerCase().includes(search) ||
    (d.category||'').toLowerCase().includes(search)
  );

  if (!filtered.length) {
    container.innerHTML = '<div class="empty" style="padding:3rem"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:48px;height:48px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div><p>Aucun document trouvé</p><button class="btn btn-outline btn-sm" onclick="openDocModal()">Ajouter un document</button></div>';
    return;
  }

  container.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:.82rem">
    <thead>
      <tr style="text-align:left;border-bottom:2px solid var(--border);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">
        <th style="padding:.5rem .75rem">Document</th>
        <th style="padding:.5rem .75rem">Résident</th>
        <th style="padding:.5rem .75rem">Catégorie</th>
        <th style="padding:.5rem .75rem">Date</th>
        <th style="padding:.5rem .75rem">Échéance</th>
        <th style="padding:.5rem .75rem;text-align:center">Télécharger</th>
      </tr>
    </thead>
    <tbody>${(() => {
    const filterRes = document.getElementById('docFilterResident')?.value;
    const groupByCat = !!filterRes;
    let catRows = '';
    if (groupByCat) {
      const groups = {};
      filtered.forEach(d => { const c = d.category || 'autre'; if(!groups[c]) groups[c] = []; groups[c].push(d); });
      const catOrder = ['administratif','medical','scolaire','judiciaire','contrat','autre'];
      const catLabels = {administratif:'Administratif',medical:'Médical',scolaire:'Scolaire',judiciaire:'Judiciaire',contrat:'Contrat',autre:'Autre'};
      let idx = 0;
      catOrder.forEach(cat => {
        const docs = groups[cat]; if(!docs) return;
        catRows += `<tr style="background:var(--g300);font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)"><td colspan="6" style="padding:.3rem .75rem;text-align:center">${catLabels[cat]||cat}</td></tr>`;
        docs.forEach(d => {
          const overdue = d.dueDate && d.dueDate < today() && !d.done;
          catRows += `<tr style="border-bottom:1px solid var(--border);background:${idx%2===0?'var(--g50)':'var(--g100)'};transition:background .1s" onmouseover="this.style.background='var(--g200)'" onmouseout="this.style.background='${idx%2===0?'var(--g50)':'var(--g100)'}'">
        <td style="padding:.35rem .75rem">
          <div style="display:flex;align-items:center;gap:.5rem">
            <span style="font-size:1.2rem">${docTypeIcon(d.mimeType)}</span>
            <span style="font-weight:600;color:${overdue?'#ef4444':'inherit'}">${escHtml(d.name)}</span>
          </div>
        </td>
        <td style="padding:.35rem .75rem;color:var(--muted)">${docAvatarCell(d.residentName)}</td>
        <td style="padding:.35rem .75rem">${docCatPill(cat, catLabels[cat]||d.category)}</td>
        <td style="padding:.35rem .75rem;color:var(--muted)">${d.docDate ? formatDate(d.docDate) : '—'}</td>
        <td style="padding:.35rem .75rem">${docEcheanceChip(d)}</td>
        <td style="padding:.35rem .75rem;text-align:center;white-space:nowrap">
          <button class="btn-dl" onclick="downloadDoc('${d.id}','${d.residentId}')" title="Télécharger"><svg class="dl-svg" width="20" height="20" viewBox="0 0 40 40"><path class="dl-arrow" d="m20 4 v14 m-5 -5 l5 5 5 -5"></path><path class="dl-base" d="m10 28 v4 h 20 v-4"></path></svg></button>
          ${d.type !== 'resource' && Auth.isAdmin() ? `<button class="btn btn-ghost btn-sm" style="margin-left:.25rem;color:${d.partageFamille ? '#16a34a' : 'var(--muted)'}" onclick="toggleDocPartageFamille('${d.id}')" title="${d.partageFamille ? 'Partagé avec la famille — cliquer pour retirer' : 'Partager ce document avec la famille'}">👪</button>` : ''}
        </td>
      </tr>`;
          idx++;
        });
      });
    } else {
      filtered.forEach((d, i) => {
        const overdue = d.dueDate && d.dueDate < today() && !d.done;
        catRows += `<tr style="border-bottom:1px solid var(--border);background:${i%2===0?'var(--g50)':'var(--g100)'};transition:background .1s" onmouseover="this.style.background='var(--g200)'" onmouseout="this.style.background='${i%2===0?'var(--g50)':'var(--g100)'}'">
        <td style="padding:.35rem .75rem">
          <div style="display:flex;align-items:center;gap:.5rem">
            <span style="font-size:1.2rem">${docTypeIcon(d.mimeType)}</span>
            <span style="font-weight:600;color:${overdue?'#ef4444':'inherit'}">${escHtml(d.name)}</span>
          </div>
        </td>
        <td style="padding:.35rem .75rem;color:var(--muted)">${docAvatarCell(d.residentName)}</td>
        <td style="padding:.35rem .75rem">${d.category ? docCatPill(d.category, d.category.charAt(0).toUpperCase()+d.category.slice(1)) : '<span style="color:var(--muted)">—</span>'}</td>
        <td style="padding:.35rem .75rem;color:var(--muted)">${d.docDate ? formatDate(d.docDate) : '—'}</td>
        <td style="padding:.35rem .75rem">${docEcheanceChip(d)}</td>
        <td style="padding:.35rem .75rem;text-align:center;white-space:nowrap">
          <button class="btn-dl" onclick="downloadDoc('${d.id}','${d.residentId}')" title="Télécharger"><svg class="dl-svg" width="20" height="20" viewBox="0 0 40 40"><path class="dl-arrow" d="m20 4 v14 m-5 -5 l5 5 5 -5"></path><path class="dl-base" d="m10 28 v4 h 20 v-4"></path></svg></button>
          ${d.type !== 'resource' && Auth.isAdmin() ? `<button class="btn btn-ghost btn-sm" style="margin-left:.25rem;color:${d.partageFamille ? '#16a34a' : 'var(--muted)'}" onclick="toggleDocPartageFamille('${d.id}')" title="${d.partageFamille ? 'Partagé avec la famille — cliquer pour retirer' : 'Partager ce document avec la famille'}">👪</button>` : ''}
        </td>
      </tr>`;
      });
    }
    return catRows;
  })()}</tbody></table>`;
}

function openDocModal(residentId) {
  resetDocForm();
  const sel = document.getElementById('docFormResident');
  if (sel) {
    const residents = sbResidents();
    sel.innerHTML = '<option value="">— Sélectionner —</option>' + residents.map(r =>
      `<option value="${r.id}">${escHtml(r.prenom||'')} ${escHtml(r.nom||'')}</option>`
    ).join('');
    const id = residentId || new URLSearchParams(window.location.search).get('residentId');
    if (id) sel.value = id;
  }
  toggleDocType('resident');
  document.getElementById('docFormDate').value = today();
  document.getElementById('docModalTitle').textContent = 'Ajouter un document';
  document.getElementById('docFormId').value = '';
  openModal('docModal');
}

function toggleDocType(type) {
  const resGroup = document.getElementById('docFormResidentGroup');
  if (resGroup) resGroup.style.display = type === 'resource' ? 'none' : '';
}

function editDocModal(docId, resId) {
  const doc = docResAll().find(d => d.id === docId);
  if (!doc) return;
  toggleDocType(doc.type === 'resource' ? 'resource' : 'resident');
  document.getElementById('docModalTitle').textContent = 'Modifier le document';
  document.getElementById('docFormId').value = docId;
  document.getElementById('docFormResident').value = resId === '_resources' ? '' : resId;
  document.getElementById('docFormName').value = doc.name || '';
  document.getElementById('docFormDate').value = doc.docDate || '';
  document.getElementById('docFormDueDate').value = doc.dueDate || '';
  document.getElementById('docFormCategory').value = doc.category || '';
  const radio = document.querySelector(`[name="docType"][value="${doc.type === 'resource' ? 'resource' : 'resident'}"]`);
  if (radio) radio.checked = true;
  openModal('docModal');
}

function resetDocForm() {
  document.getElementById('docFormId').value = '';
  document.getElementById('docFormResident').value = '';
  document.getElementById('docFormName').value = '';
  document.getElementById('docFormDate').value = '';
  document.getElementById('docFormDueDate').value = '';
  document.getElementById('docFormCategory').value = '';
  document.getElementById('docFileInput').value = '';
  document.getElementById('docFilePending').style.display = 'none';
  window._pendingDocFile = null;
}

async function saveDocument() {
  const id = document.getElementById('docFormId').value;
  const docType = document.querySelector('[name="docType"]:checked')?.value || 'resident';
  const residentId = docType === 'resource' ? '_resources' : document.getElementById('docFormResident').value;
  const name = document.getElementById('docFormName').value.trim();
  const docDate = document.getElementById('docFormDate').value;
  const dueDate = document.getElementById('docFormDueDate').value;
  const category = document.getElementById('docFormCategory').value;

  if (!residentId) { toast('Veuillez sélectionner un résident', 'error'); return; }
  if (!name && !window._pendingDocFile) { toast('Veuillez entrer un nom ou sélectionner un fichier', 'error'); return; }

  try {
    if (id) {
      const old = docResAll().find(d => d.id === id);
      if (!old) return;
      const saved = await sbSaveDocumentResident({ ...old, name: name || old.name, docDate, dueDate, category, id });
      _docResCache = _docResCache.map(d => d.id === id ? saved : d);
    } else {
      if (!window._pendingDocFile) { toast('Veuillez sélectionner un fichier', 'error'); return; }
      const file = window._pendingDocFile;
      // 1er dossier du chemin = uid du compte connecté (RLS bucket justificatifs), pas residentId.
      const uid = await sbAuthUid();
      const path = await sbUploadJustificatif(file, uid || residentId);
      const saved = await sbSaveDocumentResident({
        residentId, name: name || file.name, fileName: file.name,
        size: file.size, mimeType: file.type, category, docDate, dueDate,
        fichierPath: path, type: docType
      });
      _docResCache.unshift(saved);
      window._pendingDocFile = null;
    }
  } catch (e) { console.error('[saveDocument]', e); toast('Erreur : ' + (e?.message || e), 'error'); return; }

  toast(id ? 'Document modifié' : 'Document ajouté', 'success');
  closeModal('docModal');
  renderDocuments();
}

async function handleDocFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) { toast('Fichier trop lourd (max 3 Mo)', 'error'); return; }
  window._pendingDocFile = file;
  document.getElementById('docFilePendingName').textContent = file.name;
  document.getElementById('docFilePendingSize').textContent = fmtSize(file.size);
  document.getElementById('docFilePending').style.display = 'flex';
  if (!document.getElementById('docFormName').value) document.getElementById('docFormName').value = file.name.replace(/\.[^.]+$/, '');
}

function cancelDocFile() {
  window._pendingDocFile = null;
  document.getElementById('docFileInput').value = '';
  document.getElementById('docFilePending').style.display = 'none';
}

function deleteDocument(docId, resId) {
  if (!confirm('Supprimer ce document ?')) return;
  const doc = docResAll().find(d => d.id === docId);
  (async () => {
    try {
      await sbDeleteDocumentResident(docId);
      if (doc?.fichierPath && typeof sbDeleteJustificatif === 'function') sbDeleteJustificatif(doc.fichierPath).catch(() => {});
      _docResCache = _docResCache.filter(d => d.id !== docId);
    } catch (e) { console.error('[deleteDocument]', e); toast('Erreur suppression : ' + (e?.message || e), 'error'); return; }
    toast('Document supprimé', 'success');
    renderDocuments();
  })();
}

// ── COMPTES FAMILLE LIÉS AU RÉSIDENT FILTRÉ ──
function genPassword(len = 12) {
  // Politique create-user : ≥8 car., majuscule, minuscule, chiffre ET spécial.
  const U = 'ABCDEFGHJKMNPQRSTUVWXYZ', L = 'abcdefghijkmnpqrstuvwxyz', D = '23456789', S = '!@#$%*?-';
  const all = U + L + D + S, pick = s => s[Math.floor(Math.random() * s.length)];
  const pw = [pick(U), pick(L), pick(D), pick(S)];
  while (pw.length < Math.max(len, 8)) pw.push(pick(all));
  for (let i = pw.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pw[i], pw[j]] = [pw[j], pw[i]]; }
  return pw.join('');
}
let _famCurrentResident = '';
async function renderFamilleLiensPanel(residentId) {
  const el = document.getElementById('famLiensPanel');
  if (!el) return;
  if (!residentId || !Auth.isAdmin()) { el.innerHTML = ''; return; }
  const liens = await sbGetFamilleLiensResident(residentId);
  el.innerHTML = `<div class="card" style="margin-bottom:1.25rem;max-width:760px;margin-left:auto;margin-right:auto">
    <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
      <span class="card-title">👪 Comptes famille liés</span>
      <button class="btn btn-outline btn-sm" onclick="openFamModal('${residentId}')">+ Compte famille</button>
    </div>
    <div class="card-body">
      ${liens.length ? liens.map(l => `<div style="display:flex;align-items:center;gap:.75rem;padding:.4rem 0">
        <span style="flex:1;font-size:.85rem">${escHtml((l.prenom + ' ' + l.nom).trim() || 'Compte famille')}</span>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="delierCompteFamille('${l.lienId}','${residentId}')">Délier</button>
      </div>`).join('') : '<div style="font-size:.8rem;color:var(--muted)">Aucun compte famille lié à ce résident.</div>'}
    </div>
  </div>`;
}

function openFamModal(residentId) {
  _famCurrentResident = residentId;
  document.getElementById('famFormPrenom').value = '';
  document.getElementById('famFormNom').value = '';
  document.getElementById('famFormEmail').value = '';
  document.getElementById('famFormEmailExistant').value = '';
  document.getElementById('famCreatedInfo').style.display = 'none';
  document.querySelector('[name="famMode"][value="creer"]').checked = true;
  toggleFamMode('creer');
  openModal('famModal');
}

function toggleFamMode(mode) {
  document.getElementById('famCreerGroup').style.display = mode === 'creer' ? '' : 'none';
  document.getElementById('famLierGroup').style.display = mode === 'lier' ? '' : 'none';
}

async function soumettreCompteFamille() {
  const mode = document.querySelector('[name="famMode"]:checked')?.value;
  const info = document.getElementById('famCreatedInfo');
  if (mode === 'creer') {
    const prenom = document.getElementById('famFormPrenom').value.trim();
    const nom = document.getElementById('famFormNom').value.trim();
    const email = document.getElementById('famFormEmail').value.trim();
    if (!prenom || !nom || !email) { toast('Prénom, nom et email requis', 'error'); return; }
    const pw = genPassword();
    try {
      const { data, error } = await supabaseClient.functions.invoke('create-user', {
        body: { email, password: pw, prenom, nom, role: 'famille' }
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Échec de la création');
      await sbLierFamilleResident(data.userId, _famCurrentResident);
      info.style.display = '';
      info.innerHTML = `✅ Compte créé — <strong>${escHtml(email)}</strong> / <strong>${pw}</strong> <span style="opacity:.6">(notez-le, non ré-affiché)</span>`;
      toast('Compte famille créé et lié', 'success');
      renderFamilleLiensPanel(_famCurrentResident);
    } catch (e) {
      let msg = e?.message || 'Erreur inconnue';
      if (/already been registered|already registered|already exists/i.test(msg)) msg = 'Cet email a déjà un compte. Utilisez « Lier un compte existant ».';
      info.style.display = ''; info.innerHTML = `<span style="color:#dc2626">❌ ${escHtml(msg)}</span>`;
      console.error('[soumettreCompteFamille]', e);
    }
    return;
  }
  // Lier un compte existant : recherche par email via l'Edge Function (service_role,
  // les profils ne stockent pas l'email publiquement lisible côté client)
  const email = document.getElementById('famFormEmailExistant').value.trim();
  if (!email) { toast('Email requis', 'error'); return; }
  try {
    const { data, error } = await supabaseClient.functions.invoke('find-famille-account', { body: { email } });
    if (error) throw error;
    if (!data?.ok) { toast(data?.error || 'Compte introuvable', 'error'); return; }
    await sbLierFamilleResident(data.profileId, _famCurrentResident);
    toast(`Compte famille lié — ${data.prenom || ''} ${data.nom || ''}`.trim(), 'success');
    closeModal('famModal');
    renderFamilleLiensPanel(_famCurrentResident);
  } catch (e) { console.error('[soumettreCompteFamille:lier]', e); toast('Erreur : ' + (e?.message || e), 'error'); }
}

function delierCompteFamille(lienId, residentId) {
  confirmDialog('Retirer l\'accès de ce compte famille à ce résident ?', async () => {
    try { await sbDelierFamilleResident(lienId); } catch (e) { console.error('[delierCompteFamille]', e); toast('Erreur : ' + (e?.message || e), 'error'); return; }
    toast('Accès retiré', 'info');
    renderFamilleLiensPanel(residentId);
  });
}

function toggleDocPartageFamille(docId) {
  const doc = docResAll().find(d => d.id === docId);
  if (!doc) return;
  (async () => {
    try {
      const saved = await sbSaveDocumentResident({ ...doc, partageFamille: !doc.partageFamille });
      _docResCache = _docResCache.map(d => d.id === docId ? saved : d);
    } catch (e) { console.error('[toggleDocPartageFamille]', e); toast('Erreur : ' + (e?.message || e), 'error'); return; }
    toast(_docResCache.find(d => d.id === docId)?.partageFamille ? 'Document partagé avec la famille' : 'Partage retiré', 'success');
    renderDocuments();
  })();
}

async function initDocumentsPage() {
  await sbLoadResidentsCache();
  await loadDocResCache();
  initDocuments();
  document.getElementById('docSearchInput')?.addEventListener('input', renderDocuments);
  document.getElementById('docFilterResident')?.addEventListener('change', renderDocuments);
  document.getElementById('docFilterCategory')?.addEventListener('change', renderDocuments);
  document.getElementById('docFilterType')?.addEventListener('change', renderDocuments);
  const params = new URLSearchParams(window.location.search);
  const residentId = params.get('residentId');
  if (residentId) {
    const sel = document.getElementById('docFilterResident');
    if (sel) { sel.value = residentId; }
    renderDocuments();
  }
}
document.addEventListener('DOMContentLoaded', initDocumentsPage);
if (typeof registerPageInit === 'function') registerPageInit('documents', initDocumentsPage);
