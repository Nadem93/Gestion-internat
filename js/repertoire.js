let editingContactId = null;
const CONTACT_COLORS = ['#0891b2','#059669','#d97706','#dc2626','#7c3aed','#0284c7','#16a34a','#e11d48','#6366f1','#0ea5e9','#84cc16','#ec4899','#14b8a6','#f97316','#8b5cf6'];

// Source = Supabase. Cache mémoire chargé au démarrage.
let _repCache = [];
function getContacts() { return _repCache; }
async function loadRepertoireCache() { _repCache = await sbGetRepertoire(); }

function contactColor(org) {
  let h = 0;
  for (let i = 0; i < (org||'').length; i++) h = (h * 31 + org.charCodeAt(i)) | 0;
  return CONTACT_COLORS[Math.abs(h) % CONTACT_COLORS.length];
}

// Le rendu est assuré par js/repertoire-v2.js (maquette « Répertoire »).
// L'ancien rendu reste disponible tant que le module V2 n'est pas chargé.
function renderContacts() {
  if (typeof rep2Render === 'function') return rep2Render();
  return renderContactsLegacy();
}

function renderContactsLegacy() {
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
  container.innerHTML = `<div class="grid grid-5" style="gap:.75rem">${contacts.map(c => {
    const col = contactColor(c.organisme);
    const initiale = (c.organisme||'?')[0].toUpperCase();
    const line = (icon, txt) => `<div style="font-size:.76rem;color:var(--muted);display:flex;align-items:center;gap:.45rem;min-width:0"><span style="flex-shrink:0;width:15px;text-align:center;opacity:.85">${icon}</span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${txt}</span></div>`;
    return `<div style="cursor:pointer;background:#fff;border:1px solid #cbd5e1;border-radius:14px;padding:1rem;transition:box-shadow .2s,transform .2s;display:flex;flex-direction:column;gap:.55rem" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,.1)';this.style.transform='translateY(-2px)'" onmouseleave="this.style.boxShadow='none';this.style.transform='none'" onclick="openEditContact('${c.id}')">
      <div style="display:flex;align-items:center;gap:.6rem;min-width:0">
        <div style="width:38px;height:38px;border-radius:9px;background:${col}1f;color:${col};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0">${escHtml(initiale)}</div>
        <div style="min-width:0;font-weight:700;font-size:.9rem;color:${col};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.organisme)}</div>
      </div>
      ${(c.nom || c.fonction) ? line('👤', escHtml(c.nom)+(c.fonction ? ' · '+escHtml(c.fonction) : '')) : ''}
      ${c.tel ? line('📞', escHtml(c.tel)) : ''}
      ${c.email ? line('✉️', escHtml(c.email)) : ''}
      ${c.adresse ? line('📍', escHtml(c.adresse)) : ''}
    </div>`;
  }).join('')}</div>`;
}

function initialsOrg(name) {
  return (name||'?').split(' ').map(w=>w[0]).filter(Boolean).slice(0,2).join('').toUpperCase() || '?';
}

// Droits sur le répertoire : tout compte ayant accès peut AJOUTER ; seul un
// administrateur peut SUPPRIMER ; l'ÉDITION est réservée à l'admin ou à l'auteur du contact.
function repCanDelete() { return Auth.isAdmin(); }
function repCanEdit(c) {
  if (Auth.isAdmin()) return true;
  const uid = Auth.getSession()?.userId;
  return !!(c && c.createdBy != null && String(c.createdBy) === String(uid));
}
function repSetFormDisabled(ro) {
  ['cOrganisme', 'cNom', 'cTel', 'cEmail', 'cFonction', 'cAdresse', 'cNotes']
    .forEach(id => { const el = document.getElementById(id); if (el) el.disabled = ro; });
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
  repSetFormDisabled(false);
  if (typeof rep2SyncModal === 'function') rep2SyncModal(null, false);
  document.getElementById('contactReadonlyHint').style.display = 'none';
  document.getElementById('btnSaveContact').style.display = '';
  document.getElementById('btnDeleteContact').style.display = 'none';
  openModal('modalContact');
}

function openEditContact(id) {
  const contacts = getContacts();
  const c = contacts.find(x => x.id === id);
  if (!c) return;
  editingContactId = id;
  document.getElementById('contactId').value = id;
  document.getElementById('cOrganisme').value = c.organisme || '';
  document.getElementById('cNom').value = c.nom || '';
  document.getElementById('cTel').value = c.tel || '';
  document.getElementById('cEmail').value = c.email || '';
  document.getElementById('cFonction').value = c.fonction || '';
  document.getElementById('cAdresse').value = c.adresse || '';
  document.getElementById('cNotes').value = c.notes || '';
  const canEdit = repCanEdit(c);
  document.getElementById('modalContactTitle').textContent = canEdit ? 'Modifier le contact' : 'Contact — lecture seule';
  document.getElementById('contactReadonlyHint').style.display = canEdit ? 'none' : 'flex';
  repSetFormDisabled(!canEdit);
  if (typeof rep2SyncModal === 'function') rep2SyncModal(c, !canEdit);
  document.getElementById('btnSaveContact').style.display = canEdit ? '' : 'none';
  document.getElementById('btnDeleteContact').style.display = repCanDelete() ? '' : 'none';
  openModal('modalContact');
}

async function saveContact() {
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
    notes: document.getElementById('cNotes').value.trim()
  };

  // Catégorie et favori vivent dans des colonnes ajoutées par
  // migration-repertoire.sql : elles sont enregistrées à part, et leur absence
  // n'empêche jamais l'enregistrement du contact lui-même.
  const extras = (typeof rep2ModalExtras === 'function') ? rep2ModalExtras() : null;

  try {
    if (editingContactId) {
      const old = _repCache.find(x => x.id === editingContactId) || {};
      if (!repCanEdit(old)) { toast('Vous ne pouvez modifier que les contacts que vous avez ajoutés', 'error'); return; }
      const saved = await sbSaveRepertoire({ ...old, ...data, id: editingContactId });
      _repCache = _repCache.map(x => x.id === editingContactId ? saved : x);
      if (extras) await rep2PersistExtras(saved.id, extras);
      toast('Contact modifié', 'success');
    } else {
      data.createdBy = Auth.getSession()?.userId ?? null;
      const saved = await sbSaveRepertoire(data);
      _repCache.push(saved);
      if (extras) await rep2PersistExtras(saved.id, extras);
      toast('Contact ajouté', 'success');
    }
  } catch (e) { console.error('[saveContact]', e); toast('Erreur : ' + (e?.message || e), 'error'); return; }
  closeAllModals();
  renderContacts();
}

function deleteContact() {
  if (!repCanDelete()) { toast('Seul un administrateur peut supprimer un contact', 'error'); return; }
  if (!editingContactId || !confirm('Supprimer ce contact ?')) return;
  const id = editingContactId;
  (async () => {
    try { await sbDeleteRepertoire(id); _repCache = _repCache.filter(x => x.id !== id); }
    catch (e) { console.error('[deleteContact]', e); toast('Erreur suppression : ' + (e?.message || e), 'error'); return; }
    closeAllModals();
    toast('Contact supprimé', 'success');
    renderContacts();
  })();
}

async function loadRepertoirePage() {
  await loadRepertoireCache();
  if (typeof rep2Load === 'function') await rep2Load();
  renderContacts();
}

document.addEventListener('DOMContentLoaded', async () => { if (requireModule('access_repertoire')) { await loadRepertoirePage(); } });
if (typeof registerPageInit === 'function') registerPageInit('repertoire', loadRepertoirePage);
