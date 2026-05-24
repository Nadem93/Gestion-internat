let editingContactId = null;

function getContacts() { return DB.get(DB.keys.repertoire) || []; }
function setContacts(c) { DB.set(DB.keys.repertoire, c); }

function renderContacts() {
  const all = getContacts().sort((a,b) => a.organisme.localeCompare(b.organisme));
  const q = (document.getElementById('searchRepertoire')?.value || '').trim().toLowerCase();
  const contacts = q
    ? all.filter(c =>
        (c.organisme+'').toLowerCase().includes(q) ||
        (c.nom+'').toLowerCase().includes(q) ||
        (c.fonction+'').toLowerCase().includes(q) ||
        (c.tel+'').includes(q) ||
        (c.email+'').toLowerCase().includes(q) ||
        (c.adresse+'').toLowerCase().includes(q) ||
        (c.notes+'').toLowerCase().includes(q)
      )
    : all;
  const countEl = document.getElementById('contactCount');
  if (countEl) countEl.textContent = q ? contacts.length+'/'+all.length+' contacts' : contacts.length+' contact'+(contacts.length>1?'s':'');
  const container = document.getElementById('contactList');
  if (!contacts.length) {
    container.innerHTML = '<div class="empty"><h3>'+(q?'Aucun résultat':'Aucun contact')+'</h3><p>'+(q?'Aucun contact ne correspond à votre recherche.':'Ajoutez votre premier contact partenaire.')+'</p>'+(q?'': '<button class="btn btn-accent" onclick="openAddContact()">+ Nouveau contact</button>')+'</div>';
    return;
  }
  let html = '<div style="display:flex;flex-direction:column;gap:.75rem">';
  for (const c of contacts) {
    html += `
      <div class="card" style="cursor:pointer" onclick="openEditContact('${c.id}')">
        <div class="card-body">
          <div style="display:flex;align-items:flex-start;gap:1rem">
            <div style="width:42px;height:42px;border-radius:50%;background:var(--b50);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--blue);font-weight:700;font-size:1rem">${initialsOrg(c.organisme)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:.9rem">${escapeHtml(c.organisme)}</div>
              <div style="font-weight:500;font-size:.82rem;color:var(--g700);margin-top:1px">${escapeHtml(c.nom)}${c.fonction ? ' · '+escapeHtml(c.fonction) : ''}</div>
              <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem;font-size:.8rem">
                ${c.tel ? `<span style="display:flex;align-items:center;gap:.25rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;color:var(--muted)"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${escapeHtml(c.tel)}</span>` : ''}
                ${c.email ? `<span style="display:flex;align-items:center;gap:.25rem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;color:var(--muted)"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${escapeHtml(c.email)}</span>` : ''}
              </div>
              ${c.adresse ? `<div style="font-size:.78rem;color:var(--muted);margin-top:.35rem">${escapeHtml(c.adresse)}</div>` : ''}
              ${c.notes ? `<div style="font-size:.78rem;color:var(--muted);margin-top:.25rem;font-style:italic">${escapeHtml(c.notes)}</div>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

function initialsOrg(name) {
  return (name||'?').split(' ').map(w=>w[0]).filter(Boolean).slice(0,2).join('').toUpperCase() || '?';
}

function openAddContact() {
  editingContactId = null;
  document.getElementById('modalContactTitle').textContent = 'Nouveau contact';
  document.getElementById('contactId').value = '';
  document.getElementById('cOrganisme').value = '';
  document.getElementById('cNom').value = '';
  document.getElementById('cTel').value = '';
  document.getElementById('cEmail').value = '';
  document.getElementById('cFonction').value = '';
  document.getElementById('cAdresse').value = '';
  document.getElementById('cNotes').value = '';
  document.getElementById('btnDeleteContact').style.display = 'none';
  openModal('modalContact');
}

function openEditContact(id) {
  const contacts = getContacts();
  const c = contacts.find(x => x.id === id);
  if (!c) return;
  editingContactId = id;
  document.getElementById('modalContactTitle').textContent = 'Modifier le contact';
  document.getElementById('contactId').value = id;
  document.getElementById('cOrganisme').value = c.organisme || '';
  document.getElementById('cNom').value = c.nom || '';
  document.getElementById('cTel').value = c.tel || '';
  document.getElementById('cEmail').value = c.email || '';
  document.getElementById('cFonction').value = c.fonction || '';
  document.getElementById('cAdresse').value = c.adresse || '';
  document.getElementById('cNotes').value = c.notes || '';
  document.getElementById('btnDeleteContact').style.display = '';
  openModal('modalContact');
}

function saveContact() {
  const organisme = document.getElementById('cOrganisme').value.trim();
  const nom = document.getElementById('cNom').value.trim();
  if (!organisme || !nom) { toast('Organisme et nom du contact requis', 'error'); return; }

  const data = {
    organisme,
    nom,
    tel: document.getElementById('cTel').value.trim(),
    email: document.getElementById('cEmail').value.trim(),
    fonction: document.getElementById('cFonction').value.trim(),
    adresse: document.getElementById('cAdresse').value.trim(),
    notes: document.getElementById('cNotes').value.trim(),
    updatedAt: new Date().toISOString()
  };

  const contacts = getContacts();
  if (editingContactId) {
    const idx = contacts.findIndex(x => x.id === editingContactId);
    if (idx !== -1) { contacts[idx] = { ...contacts[idx], ...data }; }
    toast('Contact modifié', 'success');
  } else {
    data.id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    contacts.push(data);
    toast('Contact ajouté', 'success');
  }
  setContacts(contacts);
  closeAllModals();
  renderContacts();
}

function deleteContact() {
  if (!editingContactId || !confirm('Supprimer ce contact ?')) return;
  let contacts = getContacts();
  contacts = contacts.filter(x => x.id !== editingContactId);
  setContacts(contacts);
  closeAllModals();
  toast('Contact supprimé', 'success');
  renderContacts();
}

function escapeHtml(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

document.addEventListener('DOMContentLoaded', renderContacts);
