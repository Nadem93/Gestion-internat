const TR_KEY = DB.keys.transmissions;

const TR_SHIFTS = [
  { id:'matin',    label:'Matin',       short:'M',  color:'#f59e0b', bg:'#fef3c7' },
  { id:'aprem',    label:'Après-midi',  short:'AM', color:'#3b82f6', bg:'#dbeafe' },
  { id:'nuit',     label:'Nuit',        short:'N',  color:'#1e293b', bg:'#e2e8f0' }
];

const TR_CATS = [
  { id:'sante',        label:'Santé',           color:'#ef4444', icon:'🏥' },
  { id:'medicament',   label:'Médicament',      color:'#e11d48', icon:'💊' },
  { id:'comportement', label:'Comportement',    color:'#f97316', icon:'🧠' },
  { id:'alimentation', label:'Alimentation',    color:'#f59e0b', icon:'🍽️' },
  { id:'hygiene',      label:'Hygiène',         color:'#0ea5e9', icon:'🚿' },
  { id:'activite',     label:'Activité',        color:'#10b981', icon:'🎯' },
  { id:'famille',      label:'Famille',         color:'#6366f1', icon:'👨‍👩‍👧' },
  { id:'sortie',       label:'Sortie / Retour', color:'#0d9488', icon:'🚪' },
  { id:'administratif',label:'Administratif',   color:'#64748b', icon:'📋' },
  { id:'maintenance',  label:'Maintenance',     color:'#92400e', icon:'🔧' },
  { id:'urgent',       label:'Urgent',          color:'#dc2626', icon:'⚡' }
];

const TR_PRIORITIES = [
  { id:'info',    label:'Info',    color:'#64748b' },
  { id:'normal',  label:'Normal',  color:'#3b82f6' },
  { id:'urgent',  label:'Urgent',  color:'#ef4444' }
];

let _trCurrentDate = new Date().toISOString().slice(0,10);
let _trFilterShift = '';
let _trFilterResident = '';
let _trFilterCat = '';
let _trShowUnread = false;

function getTr() { return DB.get(TR_KEY) || []; }
function saveTr(list) { DB.set(TR_KEY, list); }

function _trSession() {
  const s = Auth.getSession();
  return s ? { id: s.userId, name: `${s.prenom||''} ${s.nom||''}`.trim() || s.username } : { id:'?', name:'?' };
}

function _trShift(id) { return TR_SHIFTS.find(s => s.id === id) || TR_SHIFTS[0]; }
function _trCat(id)   { return TR_CATS.find(c => c.id === id) || TR_CATS[4]; }

function _trIsRead(tr, userId) {
  return Array.isArray(tr.readBy) && tr.readBy.includes(String(userId));
}

function initTransmissions() {
  const session = Auth.requireAuth();
  if (!session) return;
  _populateTrResidents();
  _renderTrDateNav();
  _renderTransmissions();
  _updateTrUnreadBadge();

  ['trFilterShift','trFilterResident','trFilterCat'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      _trFilterShift    = document.getElementById('trFilterShift')?.value    || '';
      _trFilterResident = document.getElementById('trFilterResident')?.value || '';
      _trFilterCat      = document.getElementById('trFilterCat')?.value      || '';
      _renderTransmissions();
    });
  });

  document.getElementById('trUnreadOnly')?.addEventListener('change', e => {
    _trShowUnread = e.target.checked;
    _renderTransmissions();
  });

  // Pré-remplir shift selon l'heure
  const h = new Date().getHours();
  const autoShift = (h >= 7 && (h < 13 || (h === 13 && new Date().getMinutes() < 30))) ? 'matin' : (h >= 13 && h < 22) ? 'aprem' : 'nuit';
  const shiftEl = document.getElementById('trShift');
  if (shiftEl) shiftEl.value = autoShift;
}

function _populateTrResidents() {
  const residents = DB.get(DB.keys.residents) || [];
  ['trFilterResident','trResident'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const allOpt = id === 'trFilterResident' ? '<option value="">Tous les résidents</option>' : '<option value="">— Tous (général) —</option>';
    el.innerHTML = allOpt + residents.map(r =>
      `<option value="${r.id}">${escHtml((r.prenom||'')+' '+(r.nom||''))}</option>`
    ).join('');
  });
}

function _renderTrDateNav() {
  const el = document.getElementById('trDateLabel');
  const d = new Date(_trCurrentDate + 'T12:00:00');
  const today = new Date().toISOString().slice(0,10);
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  const fullDate = d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  let shortLabel;
  if (_trCurrentDate === today) shortLabel = "Aujourd'hui";
  else if (_trCurrentDate === yesterday) shortLabel = 'Hier';
  else shortLabel = d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
  if (el) el.textContent = _trCurrentDate === today ? `Aujourd'hui — ${fullDate}` : fullDate;
  const titleEl = document.getElementById('trTodayLabel');
  if (titleEl) titleEl.textContent = shortLabel;
  const dateEl = document.getElementById('trTodayDate');
  if (dateEl) dateEl.textContent = _trCurrentDate === today ? fullDate : (_trCurrentDate === yesterday ? fullDate : '');
}

function trPrevDay() {
  const d = new Date(_trCurrentDate + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  _trCurrentDate = d.toISOString().slice(0,10);
  _renderTrDateNav();
  _renderTransmissions();
}

function trNextDay() {
  const today = new Date().toISOString().slice(0,10);
  const d = new Date(_trCurrentDate + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  const next = d.toISOString().slice(0,10);
  if (next > today) return;
  _trCurrentDate = next;
  _renderTrDateNav();
  _renderTransmissions();
}

function trGoToday() {
  _trCurrentDate = new Date().toISOString().slice(0,10);
  _renderTrDateNav();
  _renderTransmissions();
}

function _elSet(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function _renderTransmissions() {
  const container = document.getElementById('trList');
  if (!container) return;
  const session = Auth.getSession();
  const userId = session?.userId;
  const residents = DB.get(DB.keys.residents) || [];

  const allDay = getTr().filter(t => t.date === _trCurrentDate);
  let list = [...allDay];

  if (_trFilterShift)    list = list.filter(t => t.shift === _trFilterShift);
  if (_trFilterResident) list = list.filter(t => t.residentId === _trFilterResident);
  if (_trFilterCat)      list = list.filter(t => t.cat === _trFilterCat);
  if (_trShowUnread)     list = list.filter(t => !_trIsRead(t, userId));

  list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  // Mettre à jour les stats
  const unreadCount = allDay.filter(t => !_trIsRead(t, userId)).length;
  const urgentCount = allDay.filter(t => t.priority === 'urgent' || t.cat === 'urgent').length;
  const resCount = new Set(allDay.filter(t => t.residentId).map(t => t.residentId)).size;

  _elSet('trStatTotal', `${allDay.length} total`);
  const unreadEl = document.getElementById('trStatUnread');
  if (unreadEl) {
    unreadEl.textContent = `${unreadCount} non lue${unreadCount !== 1 ? 's' : ''}`;
    unreadEl.style.color = unreadCount ? '#ef4444' : 'var(--muted)';
  }
  const urgEl = document.getElementById('trStatUrgent');
  if (urgEl) {
    urgEl.textContent = `${urgentCount} urgente${urgentCount !== 1 ? 's' : ''}`;
    urgEl.style.color = urgentCount ? '#f97316' : 'var(--muted)';
  }
  _elSet('trStatResidents', `${resCount} résident${resCount !== 1 ? 's' : ''}`);

  const unreadCountEl = document.getElementById('trUnreadCount');
  if (unreadCountEl) {
    unreadCountEl.textContent = unreadCount ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout lu ✓';
    unreadCountEl.style.color = unreadCount ? '#ef4444' : '#16a34a';
  }

  // Grouper par vacation
  const grouped = {};
  TR_SHIFTS.forEach(s => { grouped[s.id] = []; });
  list.forEach(t => { if (grouped[t.shift]) grouped[t.shift].push(t); });

  const SHIFT_HOURS = { matin: '07h–13h30', aprem: '13h30–22h', nuit: '22h–07h' };
  const SHIFT_ICONS = { matin: '🌅', aprem: '☀️', soir: '🌆', nuit: '🌙' };

  container.innerHTML = `<div class="kb-board">${
    TR_SHIFTS.map(shift => {
      const items = grouped[shift.id];
      return `<div class="kb-col">
        <div class="kb-col-hdr">
          <div class="kb-col-hdr-top">
            <div class="kb-col-name">
              ${SHIFT_ICONS[shift.id]} ${shift.label}
              <span class="kb-col-hours">${SHIFT_HOURS[shift.id]}</span>
            </div>
            <span class="kb-col-count" style="background:${shift.bg};color:${shift.color}">${items.length}</span>
          </div>
          <div class="kb-col-bar" style="background:${shift.color};opacity:.4"></div>
        </div>
        <div class="kb-cards">
          ${items.length
            ? items.map(t => _trCard(t, residents, userId)).join('<div class="kb-sep"></div>')
            : `<div class="kb-empty-col"><span class="ei">${SHIFT_ICONS[shift.id]}</span><span>Aucune transmission</span></div>`
          }
        </div>
        <button class="kb-add-btn" onclick="resetTrModal();document.getElementById('trShift').value='${shift.id}';openModal('modalTr')">+ Ajouter</button>
      </div>`;
    }).join('')
  }</div>`;

  _renderTrHisto();
}

function _trCard(t, residents, userId) {
  const r = residents.find(x => x.id === t.residentId);
  const resName = r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : '';
  const resColor = r?.color || '#64748b';
  const cat = _trCat(t.cat);
  const isRead = _trIsRead(t, userId);
  const isUrgent = t.priority === 'urgent' || t.cat === 'urgent';
  const time = t.createdAt ? new Date(t.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  const initials = resName
    ? resName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const avatarHtml = r?.photo
    ? `<img src="${escHtml(r.photo)}" class="kb-avatar kb-avatar-img" alt="${escHtml(initials)}"/>`
    : `<div class="kb-avatar" style="background:${resColor}22;color:${resColor}">${escHtml(initials)}</div>`;
  const cardClass = `kb-card${isUrgent ? ' kb-urgent' : !isRead ? ' kb-unread' : ''}`;
  const canEdit = t.authorId === String(userId);
  const canDelete = t.authorId === String(userId) || Auth.getSession()?.role === 'admin';

  if (!isRead) {
    return `<div class="${cardClass}" onclick="markTrRead('${t.id}')" style="cursor:pointer">
      <div class="kb-card-top">
        <div class="kb-resident">
          ${avatarHtml}
          <div>
            <div class="kb-card-name">${resName ? escHtml(resName) : '<em style="font-weight:400;color:var(--muted)">Général</em>'}</div>
            ${r?.chambre ? `<div class="kb-card-room">Ch. ${escHtml(String(r.chambre))}</div>` : ''}
          </div>
        </div>
        <div class="kb-time-wrap">
          <div class="kb-unread-dot"></div>
          <span class="kb-card-time">${time}</span>
        </div>
      </div>
      <div class="kb-card-body" style="position:relative;user-select:none;height:2.5rem;overflow:hidden">
        <div style="filter:blur(4px);opacity:.3;pointer-events:none;overflow:hidden;height:2.5rem;line-height:1.5">${escHtml(t.content || '')}</div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:6px;font-size:.76rem;font-weight:600;color:var(--blue)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;flex-shrink:0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Cliquer pour lire
        </div>
      </div>
      <div class="kb-card-foot">
        <div class="kb-badges">
          <span class="kb-badge" style="background:${cat.color}22;color:${cat.color}">${cat.icon} ${cat.label}</span>
          ${isUrgent ? '<span class="kb-badge" style="background:#fef2f2;color:#dc2626">⚡ Urgent</span>' : ''}
        </div>
      </div>
    </div>`;
  }

  return `<div class="${cardClass}">
    <div class="kb-card-top">
      <div class="kb-resident">
        ${avatarHtml}
        <div>
          <div class="kb-card-name">${resName ? escHtml(resName) : '<em style="font-weight:400;color:var(--muted)">Général</em>'}</div>
          ${r?.chambre ? `<div class="kb-card-room">Ch. ${escHtml(String(r.chambre))}</div>` : ''}
        </div>
      </div>
      <div class="kb-time-wrap">
        <span class="kb-card-time">${time}</span>
      </div>
    </div>
    <div class="kb-card-body">${escHtml(t.content || '')}</div>
    <div class="kb-card-foot">
      <div class="kb-badges">
        <span class="kb-badge" style="background:${cat.color}22;color:${cat.color}">${cat.icon} ${cat.label}</span>
        ${isUrgent ? '<span class="kb-badge" style="background:#fef2f2;color:#dc2626">⚡ Urgent</span>' : ''}
      </div>
      <div class="kb-actions">
        ${isUrgent ? (t.incidentId
          ? `<button class="btn-incident btn-on" onclick="annulerIncident('${t.id}')" title="Incident déclaré — cliquer pour annuler">✓ Incident</button>`
          : `<button class="btn-incident" onclick="declarerEnIncident('${t.id}')" title="Déclarer en incident">⚡ Incident</button>`) : ''}
        ${t.residentId ? (t.journalEntryId
          ? `<button class="btn-journal btn-on" onclick="annulerJournal('${t.id}')" title="Ajouté au journal — cliquer pour retirer">✓ Journal</button>`
          : `<button class="btn-journal" onclick="trVersJournal('${t.id}')" title="Ajouter au journal de bord">📔 Journal</button>`) : ''}
        ${canEdit ? `<button onclick="editTr('${t.id}')">✏</button>` : ''}
        ${canDelete ? `<button class="btn-del" onclick="deleteTr('${t.id}')">✕</button>` : ''}
      </div>
    </div>
    <div class="kb-card-author">Par <strong>${escHtml(t.authorName || '?')}</strong>${t.readBy?.length > 1 ? ` · lu par ${t.readBy.length}` : ''}</div>
  </div>`;
}

// ── HISTORIQUE JOURS PRÉCÉDENTS ──
function _renderTrHisto() {
  const el = document.getElementById('trHisto');
  if (!el) return;
  const userId = Auth.getSession()?.userId;

  const all = getTr().filter(t => t.date !== _trCurrentDate);
  const byDate = {};
  all.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = [];
    byDate[t.date].push(t);
  });

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).slice(0, 20);

  if (!dates.length) {
    el.innerHTML = '<div style="font-size:.78rem;color:var(--muted);padding:.5rem 0">Aucune transmission dans l\'historique</div>';
    return;
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const SHIFT_ICONS = { matin: '🌅', aprem: '☀️', soir: '🌆', nuit: '🌙' };

  el.innerHTML = dates.map(date => {
    const list = byDate[date];
    const d = new Date(date + 'T12:00:00');
    let dateLabel = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (date === yesterday) dateLabel = 'Hier — ' + dateLabel;

    // Comptage par vacation
    const shiftCounts = {};
    TR_SHIFTS.forEach(s => { shiftCounts[s.id] = 0; });
    list.forEach(t => { if (shiftCounts[t.shift] !== undefined) shiftCounts[t.shift]++; });

    const unread  = list.filter(t => !_trIsRead(t, userId)).length;
    const urgent  = list.filter(t => t.priority === 'urgent' || t.cat === 'urgent').length;
    const resCount = new Set(list.filter(t => t.residentId).map(t => t.residentId)).size;

    const shiftPills = TR_SHIFTS
      .filter(s => shiftCounts[s.id] > 0)
      .map(s => `<span style="font-size:.68rem;background:${s.bg};color:${s.color};padding:1px 7px;border-radius:999px;font-weight:600">${SHIFT_ICONS[s.id]} ${shiftCounts[s.id]}</span>`)
      .join('');

    return `<div class="card" style="cursor:pointer" onclick="_trCurrentDate='${date}';_renderTrDateNav();_renderTransmissions();window.scrollTo({top:0,behavior:'smooth'})">
      <div class="card-body" style="padding:.55rem 1rem;display:flex;align-items:center;gap:.65rem;flex-wrap:wrap">
        <strong style="font-size:.83rem;text-transform:capitalize;color:var(--text)">${escHtml(dateLabel)}</strong>
        <div style="display:flex;gap:.3rem;flex-wrap:wrap">${shiftPills}</div>
        <div style="margin-left:auto;display:flex;gap:.75rem;font-size:.72rem;color:var(--muted);align-items:center;flex-wrap:wrap">
          <span><strong style="color:var(--primary)">${list.length}</strong> transmission${list.length > 1 ? 's' : ''}</span>
          <span>${resCount} résident${resCount > 1 ? 's' : ''}</span>
          ${unread  ? `<span style="color:#ef4444;font-weight:600">● ${unread} non lue${unread > 1 ? 's' : ''}</span>` : '<span style="color:#16a34a">✓ Tout lu</span>'}
          ${urgent  ? `<span style="color:#f97316;font-weight:600">⚡ ${urgent} urgent${urgent > 1 ? 's' : ''}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function markTrRead(id) {
  const list = getTr();
  const t = list.find(x => x.id === id);
  if (!t) return;
  const userId = String(Auth.getSession()?.userId || '');
  if (!Array.isArray(t.readBy)) t.readBy = [];
  if (!t.readBy.includes(userId)) t.readBy.push(userId);
  saveTr(list);
  _renderTransmissions();
  _updateTrUnreadBadge();
}

function markAllTrRead() {
  const list = getTr();
  const userId = String(Auth.getSession()?.userId || '');
  const today = new Date().toISOString().slice(0,10);
  list.filter(t => t.date === _trCurrentDate).forEach(t => {
    if (!Array.isArray(t.readBy)) t.readBy = [];
    if (!t.readBy.includes(userId)) t.readBy.push(userId);
  });
  saveTr(list);
  _renderTransmissions();
  _updateTrUnreadBadge();
  toast('Toutes les transmissions marquées comme lues');
}

function _updateTrUnreadBadge() {
  const today = new Date().toISOString().slice(0,10);
  const userId = String(Auth.getSession()?.userId || '');
  const count = getTr().filter(t => t.date === today && !_trIsRead(t, userId)).length;
  document.querySelectorAll('.tr-badge').forEach(el => {
    el.textContent = count || '';
    el.classList.toggle('hidden', !count);
  });
}

function saveTr_Modal() {
  const editId = document.getElementById('trEditId')?.value || '';
  const residentId = document.getElementById('trResident')?.value || '';
  const shift    = document.getElementById('trShift')?.value || 'matin';
  const cat      = document.getElementById('trCat')?.value || 'administratif';
  const priority = document.getElementById('trPriority')?.value || 'normal';
  const content  = document.getElementById('trContent')?.value.trim() || '';

  if (!content) { toast('Le contenu est obligatoire', 'error'); return; }

  const list = getTr();
  const sess = _trSession();
  const now = new Date().toISOString();

  if (editId) {
    const idx = list.findIndex(x => x.id === editId);
    if (idx >= 0) {
      Object.assign(list[idx], { residentId, shift, cat, priority, content, updatedAt: now });
    }
    toast('Transmission modifiée');
  } else {
    const residents = DB.get(DB.keys.residents) || [];
    const r = residents.find(x => x.id === residentId);
    list.unshift({
      id: genId(),
      date: _trCurrentDate,
      residentId,
      residentName: r ? `${r.prenom||''} ${r.nom||''}`.trim() : '',
      shift, cat, priority, content,
      authorId: String(sess.id),
      authorName: sess.name,
      createdAt: now,
      readBy: [String(sess.id)]
    });
    toast('Transmission ajoutée', 'success');
  }

  saveTr(list);
  closeModal('modalTr');
  resetTrModal();
  _renderTransmissions();
  _updateTrUnreadBadge();
}

function editTr(id) {
  const t = getTr().find(x => x.id === id);
  if (!t) return;
  document.getElementById('trEditId').value = id;
  document.getElementById('trResident').value = t.residentId || '';
  document.getElementById('trShift').value = t.shift || 'matin';
  document.getElementById('trCat').value = t.cat || 'administratif';
  document.getElementById('trPriority').value = t.priority || 'normal';
  document.getElementById('trContent').value = t.content || '';
  document.getElementById('modalTrTitle').textContent = 'Modifier la transmission';
  openModal('modalTr');
}

function deleteTr(id) {
  if (!confirm('Supprimer cette transmission ?')) return;
  saveTr(getTr().filter(x => x.id !== id));
  _renderTransmissions();
  _updateTrUnreadBadge();
  toast('Transmission supprimée');
}

function declarerEnIncident(trId) {
  const list = getTr();
  const t = list.find(x => x.id === trId);
  if (!t) return;
  const sess = _trSession();
  const cat = _trCat(t.cat);
  const incident = {
    id: genId(),
    titre: `${cat.icon} ${cat.label} — ${(t.content || '').slice(0, 60)}${(t.content || '').length > 60 ? '…' : ''}`,
    type: 'autre',
    gravite: 'moyen',
    date: t.date,
    heure: t.createdAt ? new Date(t.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
    residentId: t.residentId || null,
    residentName: t.residentName || '',
    lieu: '',
    description: `[Issu d'une transmission urgente — vacation ${_trShift(t.shift).label} du ${t.date}]\n\n${t.content || ''}`,
    statut: 'declare',
    declaredBy: sess.name,
    declaredById: String(sess.id),
    declaredAt: new Date().toISOString(),
    sourceTransmissionId: trId
  };
  const incidents = DB.get(DB.keys.incidents) || [];
  incidents.unshift(incident);
  DB.set(DB.keys.incidents, incidents);
  t.incidentId = incident.id;
  saveTr(list);
  if (typeof auditLog === 'function') auditLog('incident_create', `Depuis transmission — ${incident.titre}`);
  toast('Incident déclaré ✓');
  _renderTransmissions();
}

function annulerIncident(trId) {
  const list = getTr();
  const t = list.find(x => x.id === trId);
  if (!t || !t.incidentId) return;
  const incidents = (DB.get(DB.keys.incidents) || []).filter(i => i.id !== t.incidentId);
  DB.set(DB.keys.incidents, incidents);
  delete t.incidentId;
  saveTr(list);
  toast('Incident annulé');
  _renderTransmissions();
}

function trVersJournal(trId) {
  const list = getTr();
  const t = list.find(x => x.id === trId);
  if (!t || !t.residentId) return;
  const sess = _trSession();
  const residents = DB.get(DB.keys.residents) || [];
  const r = residents.find(x => x.id === t.residentId);
  const shiftLabel = _trShift(t.shift).label;
  const entry = {
    id: genId(),
    type: 'observation',
    residentId: t.residentId,
    resident: r ? `${r.prenom || ''} ${r.nom || ''}`.trim() : '',
    residentColor: r?.color || '#3b82f6',
    categorie: t.cat || 'general',
    date: new Date().toISOString(),
    objectif: '',
    contenu: `[Transmission ${shiftLabel} — ${t.date}]\n${t.content || ''}`,
    visibilite: 'equipe',
    serafinphType: '',
    attachments: [],
    author: sess.name,
    authorId: String(sess.id),
    replies: [],
    readBy: [String(sess.id)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const journal = DB.get(DB.keys.journal) || [];
  journal.push(entry);
  DB.set(DB.keys.journal, journal);
  t.journalEntryId = entry.id;
  saveTr(list);
  if (typeof auditLog === 'function') auditLog('journal_create', `Depuis transmission — ${entry.resident}`);
  toast('Entrée ajoutée au journal ✓');
  _renderTransmissions();
}

function annulerJournal(trId) {
  const list = getTr();
  const t = list.find(x => x.id === trId);
  if (!t || !t.journalEntryId) return;
  const journal = (DB.get(DB.keys.journal) || []).filter(e => e.id !== t.journalEntryId);
  DB.set(DB.keys.journal, journal);
  delete t.journalEntryId;
  saveTr(list);
  toast('Entrée journal retirée');
  _renderTransmissions();
}

function resetTrModal() {
  document.getElementById('trEditId').value = '';
  document.getElementById('trResident').value = '';
  document.getElementById('trContent').value = '';
  document.getElementById('trCat').value = 'administratif';
  document.getElementById('trPriority').value = 'normal';
  document.getElementById('modalTrTitle').textContent = 'Nouvelle transmission';
  const h = new Date().getHours();
  const autoShift = (h >= 7 && (h < 13 || (h === 13 && new Date().getMinutes() < 30))) ? 'matin' : (h >= 13 && h < 22) ? 'aprem' : 'nuit';
  document.getElementById('trShift').value = autoShift;
  trGoStep(1);
}

function trGoStep(step) {
  for (let i = 1; i <= 3; i++) {
    const nav = document.getElementById('trStep' + i + 'Nav');
    if (!nav) continue;
    if (i === step) {
      nav.style.background = 'rgba(255,255,255,.18)';
      nav.style.opacity = '1';
      const circle = nav.querySelector('span');
      if (circle) { circle.style.background = '#fff'; circle.style.color = '#059669'; }
    } else {
      nav.style.background = 'transparent';
      nav.style.opacity = '.55';
      const circle = nav.querySelector('span');
      if (circle) { circle.style.background = 'rgba(255,255,255,.2)'; circle.style.color = '#fff'; }
    }
  }
  const label = document.getElementById('trStepLabel');
  if (label) label.textContent = 'Étape ' + step + ' sur 3';
  const sections = ['trFormStep1','trFormStep2','trFormStep3'];
  sections.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (el) el.style.outline = 'none';
  });
  const target = document.getElementById('trFormStep' + step);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.addEventListener('DOMContentLoaded', () => {
  initTransmissions();
  if (typeof registerPageInit === 'function') registerPageInit('transmissions', initTransmissions);
});
