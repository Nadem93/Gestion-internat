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
  const all = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || '{}');
  const residents = DB.get(DB.keys.residents) || [];
  const list = [];
  for (const [resId, docs] of Object.entries(all)) {
    const r = residents.find(x => x.id === resId);
    docs.forEach(d => list.push({ ...d, residentId: resId, residentName: r ? `${r.prenom||''} ${r.nom||''}` : 'Inconnu' }));
  }
  return list.sort((a, b) => (b.docDate || b.date || '').localeCompare(a.docDate || a.date || ''));
}

function initDocuments() {
  const session = Auth.requireAuth();
  if (!session) return;
  populateDocResidentSelect();
  renderDocuments();
}

function populateDocResidentSelect() {
  const sel = document.getElementById('docFilterResident');
  if (!sel) return;
  const residents = DB.get(DB.keys.residents) || [];
  sel.innerHTML = '<option value="">Tous les résidents</option>' + residents.map(r =>
    `<option value="${r.id}">${escHtml(r.prenom||'')} ${escHtml(r.nom||'')}</option>`
  ).join('');
}

function renderDocuments() {
  const container = document.getElementById('documentList');
  if (!container) return;
  const list = getAllDocuments();
  const search = (document.getElementById('docSearchInput')?.value || '').toLowerCase();
  const filterRes = document.getElementById('docFilterResident')?.value || '';

  let filtered = list;
  if (filterRes) filtered = filtered.filter(d => d.residentId === filterRes);
  if (search) filtered = filtered.filter(d => (d.name||'').toLowerCase().includes(search) || (d.residentName||'').toLowerCase().includes(search));

  if (!filtered.length) {
    container.innerHTML = '<div class="empty" style="padding:3rem"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:48px;height:48px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div><p>Aucun document trouvé</p><button class="btn btn-outline btn-sm" onclick="openDocModal()">Ajouter un document</button></div>';
    return;
  }

  container.innerHTML = `<div class="grid grid-4" style="gap:.85rem">${filtered.map(d => {
    const overdue = d.dueDate && d.dueDate < today() && !d.done;
    return `<div class="card" style="border-color:${overdue ? '#ef4444' : 'var(--border)'}">
      <div class="card-body" style="padding:1rem">
        <div style="font-size:2rem;margin-bottom:.5rem;text-align:center">${docTypeIcon(d.mimeType)}</div>
        <div style="font-weight:600;font-size:.85rem;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escHtml(d.name)}">${escHtml(d.name)}</div>
        <div style="font-size:.72rem;color:var(--muted);text-align:center;margin-top:2px">${escHtml(d.residentName)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:.35rem;justify-content:center;margin-top:.5rem;font-size:.7rem;color:var(--muted)">
          ${d.docDate ? `<span>📅 ${formatDate(d.docDate)}</span>` : ''}
          ${d.dueDate ? `<span style="color:${overdue ? '#ef4444' : 'var(--muted)'}">⏰ ${formatDate(d.dueDate)}${overdue ? ' (Expiré)' : ''}</span>` : ''}
        </div>
        <div style="display:flex;gap:.35rem;margin-top:.75rem;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="downloadDoc('${d.id}','${d.residentId}')">📥</button>
          <button class="btn btn-ghost btn-sm" onclick="editDocModal('${d.id}','${d.residentId}')">✎</button>
          <button class="btn btn-ghost btn-sm admin-only" style="color:var(--red)" onclick="deleteDocument('${d.id}','${d.residentId}')">✕</button>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function openDocModal(residentId) {
  resetDocForm();
  const sel = document.getElementById('docFormResident');
  if (sel) {
    const residents = DB.get(DB.keys.residents) || [];
    sel.innerHTML = '<option value="">— Sélectionner —</option>' + residents.map(r =>
      `<option value="${r.id}">${escHtml(r.prenom||'')} ${escHtml(r.nom||'')}</option>`
    ).join('');
    const id = residentId || new URLSearchParams(window.location.search).get('residentId');
    if (id) sel.value = id;
  }
  document.getElementById('docFormDate').value = today();
  document.getElementById('docModalTitle').textContent = 'Ajouter un document';
  document.getElementById('docFormId').value = '';
  openModal('docModal');
}

function editDocModal(docId, resId) {
  const allDocs = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || '{}');
  const doc = (allDocs[resId]||[]).find(d => d.id === docId);
  if (!doc) return;
  document.getElementById('docModalTitle').textContent = 'Modifier le document';
  document.getElementById('docFormId').value = docId;
  document.getElementById('docFormResident').value = resId;
  document.getElementById('docFormName').value = doc.name || '';
  document.getElementById('docFormDate').value = doc.docDate || '';
  document.getElementById('docFormDueDate').value = doc.dueDate || '';
  document.getElementById('docFormCategory').value = doc.category || '';
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
  const residentId = document.getElementById('docFormResident').value;
  const name = document.getElementById('docFormName').value.trim();
  const docDate = document.getElementById('docFormDate').value;
  const dueDate = document.getElementById('docFormDueDate').value;
  const category = document.getElementById('docFormCategory').value;

  if (!residentId) { toast('Veuillez sélectionner un résident', 'error'); return; }
  if (!name && !window._pendingDocFile) { toast('Veuillez entrer un nom ou sélectionner un fichier', 'error'); return; }

  let allDocs = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || '{}');
  if (!allDocs[residentId]) allDocs[residentId] = [];

  if (id) {
    const idx = allDocs[residentId].findIndex(d => d.id === id);
    if (idx === -1) return;
    allDocs[residentId][idx].name = name || allDocs[residentId][idx].name;
    allDocs[residentId][idx].docDate = docDate;
    allDocs[residentId][idx].dueDate = dueDate;
    allDocs[residentId][idx].category = category;
  } else {
    if (!window._pendingDocFile) { toast('Veuillez sélectionner un fichier', 'error'); return; }
    try {
      const base64 = await fileToBase64(window._pendingDocFile);
      const doc = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
        name: name || window._pendingDocFile.name,
        fileName: window._pendingDocFile.name,
        size: window._pendingDocFile.size,
        mimeType: window._pendingDocFile.type,
        category,
        docDate,
        dueDate,
        date: new Date().toISOString(),
        data: base64
      };
      allDocs[residentId].push(doc);
    } catch { toast('Erreur lors de la lecture du fichier', 'error'); return; }
    window._pendingDocFile = null;
  }

  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(allDocs));
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
  let allDocs = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || '{}');
  if (!allDocs[resId]) return;
  allDocs[resId] = allDocs[resId].filter(d => d.id !== docId);
  if (!allDocs[resId].length) delete allDocs[resId];
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(allDocs));
  toast('Document supprimé', 'success');
  renderDocuments();
}

function initDocumentsPage() {
  initDocuments();
  document.getElementById('docSearchInput')?.addEventListener('input', renderDocuments);
  document.getElementById('docFilterResident')?.addEventListener('change', renderDocuments);
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
